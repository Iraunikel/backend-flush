import React, { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Palette, RotateCcw, Sparkles, MessageSquare, Copy, Clipboard, Edit3, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface Annotation {
  id: string;
  startIndex: number;
  endIndex: number;
  relevanceLevel: 'high' | 'medium' | 'neutral' | 'low';
  text: string;
  comment?: string;
}

interface AnnotationInterfaceProps {
  content: string;
  onContentChange: (content: string) => void;
  onAnnotationsChange: (annotations: Annotation[]) => void;
  onRefinePrompt: () => void;
}

const AnnotationInterface: React.FC<AnnotationInterfaceProps> = ({
  content,
  onContentChange,
  onAnnotationsChange,
  onRefinePrompt
}) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedRelevance, setSelectedRelevance] = useState<'high' | 'medium' | 'neutral' | 'low'>('high');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] = useState<Omit<Annotation, 'comment'> | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const relevanceLevels = [
    { key: 'high', label: 'High', color: 'high', description: 'Most relevant', emoji: '🔥' },
    { key: 'medium', label: 'Medium', color: 'medium', description: 'Somewhat relevant', emoji: '⚡' },
    { key: 'neutral', label: 'Neutral', color: 'neutral', description: 'Neutral', emoji: '⚪' },
    { key: 'low', label: 'Low', color: 'low', description: 'Least relevant', emoji: '❄️' }
  ] as const;

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    if (!selectedText || !contentRef.current) return;

    // Get selection position for comment input
    const rect = range.getBoundingClientRect();
    const containerRect = contentRef.current.getBoundingClientRect();
    
    // Calculate text indices
    const containerText = contentRef.current.textContent || '';
    const startIndex = containerText.indexOf(selectedText);
    const endIndex = startIndex + selectedText.length;

    if (startIndex === -1) return;

    // Create pending annotation
    const newAnnotation: Omit<Annotation, 'comment'> = {
      id: `annotation-${Date.now()}-${Math.random()}`,
      startIndex,
      endIndex,
      relevanceLevel: selectedRelevance,
      text: selectedText
    };

    setPendingAnnotation(newAnnotation);
    setCommentPosition({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.bottom - containerRect.top + 10
    });
    setShowCommentInput(true);

    // Clear selection
    selection.removeAllRanges();
  }, [annotations, selectedRelevance, onAnnotationsChange]);

  const handleCommentSubmit = () => {
    if (!pendingAnnotation) return;

    const finalAnnotation: Annotation = {
      ...pendingAnnotation,
      comment: commentText.trim() || undefined
    };

    const updatedAnnotations = [...annotations, finalAnnotation];
    setAnnotations(updatedAnnotations);
    onAnnotationsChange(updatedAnnotations);

    // Reset state
    setShowCommentInput(false);
    setPendingAnnotation(null);
    setCommentText('');
  };

  const handleCommentCancel = () => {
    setShowCommentInput(false);
    setPendingAnnotation(null);
    setCommentText('');
  };

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || '';
    onContentChange(newContent);
    // Clear annotations when content changes significantly
    if (annotations.length > 0) {
      setAnnotations([]);
      onAnnotationsChange([]);
    }
  };

  const clearAnnotations = () => {
    setAnnotations([]);
    onAnnotationsChange([]);
  };

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied!",
        description: "Content copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const renderAnnotatedContent = () => {
    if (annotations.length === 0) {
      return content;
    }

    // Sort annotations by start index
    const sortedAnnotations = [...annotations].sort((a, b) => a.startIndex - b.startIndex);
    
    let result = [];
    let lastIndex = 0;

    sortedAnnotations.forEach((annotation, index) => {
      // Add text before annotation
      if (annotation.startIndex > lastIndex) {
        result.push(content.slice(lastIndex, annotation.startIndex));
      }

      // Add annotated text with heatmap styling - semi-transparent color overlay
      result.push(
        `<span
          key="${annotation.id}"
          class="
            px-1.5 py-0.5 mx-0.5 rounded-sm cursor-pointer
            text-foreground font-medium
            transition-all duration-200 ease-out
            hover:scale-[1.01]
            relative
          "
          style="
            background-color: hsl(var(--annotation-${annotation.relevanceLevel}-bg));
            border-left: 3px solid hsl(var(--annotation-${annotation.relevanceLevel}));
          "
          title="${annotation.comment || relevanceLevels.find(l => l.key === annotation.relevanceLevel)?.description}"
        >
          ${annotation.text}
        </span>`
      );

      lastIndex = annotation.endIndex;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      result.push(content.slice(lastIndex));
    }

    return result.join('');
  };

  return (
    <div className="space-y-6">
      {/* Annotation Controls */}
      <div className="flex flex-wrap items-center gap-4 p-5 bg-card rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-annotation-high to-annotation-low flex items-center justify-center">
            <Palette className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">Choose Relevance:</span>
        </div>
        
        <div className="flex gap-2">
          {relevanceLevels.map((level) => (
            <Button
              key={level.key}
              variant={selectedRelevance === level.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRelevance(level.key as any)}
              className={`
                h-9 text-xs font-medium transition-all duration-200 
                ${selectedRelevance === level.key 
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25' 
                  : `border-annotation-${level.color}/30 hover:bg-annotation-${level.color}-bg hover:border-annotation-${level.color}/50`
                }
              `}
            >
              <span className="mr-1.5">{level.emoji}</span>
              {level.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={clearAnnotations}
            className="h-8"
            disabled={annotations.length === 0}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              AI Response
              <span className="text-xs text-muted-foreground font-normal">(Click to edit)</span>
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyContent}
                className="h-7"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
              {annotations.length > 0 && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">
                        <Eye className="w-3 h-3 mr-1" />
                        {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
                      </Badge>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                      <div className="p-4">
                        <h4 className="font-semibold text-sm mb-3">All Annotations</h4>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {annotations.map((annotation) => (
                            <div key={annotation.id} className="border rounded-lg p-3 bg-background/50">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-annotation-${annotation.relevanceLevel} font-medium text-xs`}>
                                  {relevanceLevels.find(l => l.key === annotation.relevanceLevel)?.emoji} {relevanceLevels.find(l => l.key === annotation.relevanceLevel)?.label}
                                </span>
                              </div>
                              <div className="text-xs text-foreground mb-2 font-medium">
                                "{annotation.text}"
                              </div>
                              {annotation.comment && (
                                <div className="text-xs text-muted-foreground italic">
                                  💬 {annotation.comment}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button
                    onClick={onRefinePrompt}
                    size="sm"
                    className="h-7 bg-gradient-to-r from-primary to-primary-glow"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Refine Prompt
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <div className="relative">
            <div
              ref={contentRef}
              className="min-h-32 text-sm select-text p-4 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
              contentEditable
              suppressContentEditableWarning
              onInput={handleContentChange}
              onMouseUp={handleTextSelection}
              dangerouslySetInnerHTML={{ __html: renderAnnotatedContent() }}
              style={{ 
                userSelect: 'text',
                minHeight: '120px'
              }}
            />
            
            {/* Inline Comment Input */}
            {showCommentInput && pendingAnnotation && (
              <div 
                className="absolute z-10 bg-card border rounded-lg shadow-lg p-3 min-w-64"
                style={{
                  left: `${commentPosition.x}px`,
                  top: `${commentPosition.y}px`,
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    <span className={`font-medium text-annotation-${pendingAnnotation.relevanceLevel}`}>
                      {relevanceLevels.find(l => l.key === pendingAnnotation.relevanceLevel)?.emoji} {relevanceLevels.find(l => l.key === pendingAnnotation.relevanceLevel)?.label}
                    </span>
                    {" - "}"<span className="italic">{pendingAnnotation.text.slice(0, 40)}{pendingAnnotation.text.length > 40 ? '...' : ''}</span>"
                  </div>
                  <Input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add context (optional)..."
                    className="text-xs h-8"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCommentSubmit();
                      } else if (e.key === 'Escape') {
                        handleCommentCancel();
                      }
                    }}
                  />
                  <div className="flex gap-1">
                    <Button size="sm" onClick={handleCommentSubmit} className="h-6 text-xs">
                      Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCommentCancel} className="h-6 text-xs">
                      Skip
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            💡 Select text to annotate with relevance levels. Comments help provide context.
          </p>
        </div>
      </Card>

      {/* Annotation Legend */}
      {annotations.length > 0 && (
        <Card className="p-5 bg-gradient-to-br from-card to-card/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded bg-gradient-to-r from-annotation-high to-annotation-low"></div>
            <h4 className="text-sm font-semibold text-foreground">Annotation Heatmap</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {relevanceLevels.map((level) => {
              const levelAnnotations = annotations.filter(a => a.relevanceLevel === level.key);
              const totalAnnotatedLength = levelAnnotations.reduce((sum, annotation) => sum + (annotation.endIndex - annotation.startIndex), 0);
              const totalContentLength = content.length;
              const percentage = totalContentLength > 0 ? Math.round((totalAnnotatedLength / totalContentLength) * 100) : 0;
              return (
                <div key={level.key} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background/50 border">
                  <div className={`w-6 h-6 rounded-full bg-annotation-${level.color} shadow-lg flex items-center justify-center text-white text-xs font-bold`}>
                    {levelAnnotations.length}
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-foreground">{level.emoji} {level.label}</div>
                    <div className="text-muted-foreground">{percentage}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AnnotationInterface;
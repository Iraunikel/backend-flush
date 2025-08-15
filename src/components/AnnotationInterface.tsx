import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  annotations: Annotation[];
}

const AnnotationInterface: React.FC<AnnotationInterfaceProps> = ({
  content,
  onContentChange,
  onAnnotationsChange,
  onRefinePrompt,
  annotations
}) => {
  const [selectedRelevance, setSelectedRelevance] = useState<'high' | 'medium' | 'neutral' | 'low'>('high');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] = useState<Omit<Annotation, 'comment'> | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLDivElement>(null);
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

    // Auto-add annotation without comment first
    const finalAnnotation: Annotation = {
      ...newAnnotation
    };

    const updatedAnnotations = [...annotations, finalAnnotation];
    onAnnotationsChange(updatedAnnotations);

    // Show comment input for optional comment
    setPendingAnnotation(finalAnnotation);
    setCommentPosition({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.bottom - containerRect.top + 10
    });
    setShowCommentInput(true);

    // Clear selection
    selection.removeAllRanges();
  }, [annotations, selectedRelevance, onAnnotationsChange]);

  // Handle click outside to close comment input
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commentInputRef.current && !commentInputRef.current.contains(event.target as Node)) {
        if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
          setShowCommentInput(false);
          setPendingAnnotation(null);
          setCommentText('');
        }
      }
    };

    if (showCommentInput) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCommentInput]);

  const handleCommentSubmit = () => {
    if (!pendingAnnotation) return;

    // Update existing annotation with comment
    const updatedAnnotations = annotations.map(ann => 
      ann.id === pendingAnnotation.id 
        ? { ...ann, comment: commentText.trim() || undefined }
        : ann
    );
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
  };

  const clearAnnotations = () => {
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

    // Create a map of character positions to annotations
    const charMap: { [key: number]: Annotation[] } = {};
    annotations.forEach(annotation => {
      for (let i = annotation.startIndex; i < annotation.endIndex; i++) {
        if (!charMap[i]) charMap[i] = [];
        charMap[i].push(annotation);
      }
    });

    const result = [];
    let currentAnnotations: Annotation[] = [];
    let currentText = '';
    let currentStart = 0;

    const arraysEqual = (a: Annotation[], b: Annotation[]): boolean => {
      if (a.length !== b.length) return false;
      const aIds = a.map(ann => ann.id).sort();
      const bIds = b.map(ann => ann.id).sort();
      return aIds.every((id, index) => id === bIds[index]);
    };

    for (let i = 0; i < content.length; i++) {
      const charAnnotations = charMap[i] || [];
      
      // Check if annotations changed
      const annotationsChanged = !arraysEqual(currentAnnotations, charAnnotations);
      
      if (annotationsChanged) {
        // Push current segment if it has content
        if (currentText) {
          if (currentAnnotations.length > 0) {
            // Find the highest priority annotation
            const primaryAnnotation = currentAnnotations.reduce((prev, curr) => {
              const priority = { high: 4, medium: 3, neutral: 2, low: 1 };
              return priority[curr.relevanceLevel] > priority[prev.relevanceLevel] ? curr : prev;
            });
            
            result.push(
              `<span
                class="
                  px-1.5 py-0.5 mx-0.5 rounded-sm cursor-pointer
                  text-foreground font-medium
                  transition-all duration-200 ease-out
                  hover:scale-[1.01]
                  relative
                "
                style="
                  background-color: hsl(var(--annotation-${primaryAnnotation.relevanceLevel}-bg));
                  border-left: 3px solid hsl(var(--annotation-${primaryAnnotation.relevanceLevel}));
                "
                title="${primaryAnnotation.comment || relevanceLevels.find(l => l.key === primaryAnnotation.relevanceLevel)?.description}"
              >
                ${currentText}
              </span>`
            );
          } else {
            result.push(currentText);
          }
        }
        
        // Reset for new segment
        currentAnnotations = charAnnotations;
        currentText = content[i];
        currentStart = i;
      } else {
        currentText += content[i];
      }
    }

    // Handle final segment
    if (currentText) {
      if (currentAnnotations.length > 0) {
        const primaryAnnotation = currentAnnotations.reduce((prev, curr) => {
          const priority = { high: 4, medium: 3, neutral: 2, low: 1 };
          return priority[curr.relevanceLevel] > priority[prev.relevanceLevel] ? curr : prev;
        });
        
        result.push(
          `<span
            class="
              px-1.5 py-0.5 mx-0.5 rounded-sm cursor-pointer
              text-foreground font-medium
              transition-all duration-200 ease-out
              hover:scale-[1.01]
              relative
            "
            style="
              background-color: hsl(var(--annotation-${primaryAnnotation.relevanceLevel}-bg));
              border-left: 3px solid hsl(var(--annotation-${primaryAnnotation.relevanceLevel}));
            "
            title="${primaryAnnotation.comment || relevanceLevels.find(l => l.key === primaryAnnotation.relevanceLevel)?.description}"
          >
            ${currentText}
          </span>`
        );
      } else {
        result.push(currentText);
      }
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
                <Button
                  onClick={onRefinePrompt}
                  size="sm"
                  className="h-7 bg-gradient-to-r from-primary to-primary-glow"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Refine Prompt
                </Button>
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
                ref={commentInputRef}
                className="absolute z-10 bg-card/95 backdrop-blur-sm border rounded-lg shadow-lg p-3 min-w-64"
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
                    {" - Selection highlighted"}
                  </div>
                  <div className="relative">
                    <Input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add or select next"
                      className="text-xs h-8 border-primary/20 pr-8"
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
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={handleCommentSubmit} 
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      ↵
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            💡 Select text to annotate with relevance levels. Non-selected areas will be kept without changes. Click to edit.
          </p>
        </div>
      </Card>

      {/* Annotation Heatmap */}
      <Card className="p-5 bg-gradient-to-br from-card to-card/50">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-gradient-to-r from-annotation-high to-annotation-low"></div>
          <h4 className="text-sm font-semibold text-foreground">Annotation Heatmap</h4>
        </div>
        
        {/* Visual Heatmap */}
        <div className="mb-6">
          <div className="h-8 rounded-lg overflow-hidden border bg-background/50 relative">
            {content.length > 0 ? (
              <>
                {/* Calculate coverage percentages */}
                {(() => {
                  const textLength = content.length;
                  let annotatedChars = 0;
                  let highChars = 0;
                  let mediumChars = 0;
                  let lowChars = 0;
                  let neutralChars = 0;

                  annotations.forEach(annotation => {
                    const length = annotation.endIndex - annotation.startIndex;
                    annotatedChars += length;
                    
                    switch (annotation.relevanceLevel) {
                      case 'high': highChars += length; break;
                      case 'medium': mediumChars += length; break;
                      case 'low': lowChars += length; break;
                      default: neutralChars += length;
                    }
                  });

                  const annotatedPercentage = (annotatedChars / textLength) * 100;
                  const neutralPercentage = 100 - annotatedPercentage;

                  // Determine dominant annotation type
                  let dominantColor = '#9CA3AF'; // gray-400 for neutral
                  if (highChars > mediumChars && highChars > lowChars && highChars > neutralChars) {
                    dominantColor = '#EF4444'; // red-500
                  } else if (lowChars > highChars && lowChars > mediumChars && lowChars > neutralChars) {
                    dominantColor = '#3B82F6'; // blue-500
                  } else if (mediumChars > 0 || neutralChars > 0) {
                    dominantColor = '#F59E0B'; // amber-500
                  }

                  return (
                    <>
                      {/* Background gradient based on coverage */}
                      {annotations.length === 0 ? (
                        <div 
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(90deg, #9CA3AF 0%, #9CA3AF 100%)'
                          }}
                        ></div>
                      ) : (
                        <div 
                          className="absolute inset-0"
                          style={{
                            background: `linear-gradient(90deg, 
                              #3B82F6 0%, 
                              #9CA3AF ${Math.max(0, neutralPercentage - 5)}%, 
                              ${dominantColor} ${Math.min(100, neutralPercentage + 5)}%, 
                              ${dominantColor} 100%)`
                          }}
                        ></div>
                      )}
                      
                      {/* Coverage percentage display */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-xs font-bold drop-shadow-sm">
                          {Math.round(annotatedPercentage)}% Annotated
                        </span>
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 via-gray-400/30 to-red-500/30 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">No content to visualize</span>
              </div>
            )}
          </div>
          
          {/* Simple gradient legend */}
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              Low Relevance
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              High Relevance
            </span>
          </div>
        </div>

        {/* Statistics */}
        {annotations.length > 0 && (
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
        )}
      </Card>

      {/* All Annotations List */}
      {annotations.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <h4 className="text-sm font-semibold text-foreground">All Annotations ({annotations.length})</h4>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAnnotations}
              className="h-7 text-xs"
              disabled={annotations.length === 0}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {annotations.map((annotation, index) => (
              <div key={annotation.id} className="border rounded-lg p-3 bg-background/50 group relative">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-annotation-${annotation.relevanceLevel} font-medium text-xs`}>
                    {relevanceLevels.find(l => l.key === annotation.relevanceLevel)?.emoji} {relevanceLevels.find(l => l.key === annotation.relevanceLevel)?.label}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const updatedAnnotations = annotations.filter(a => a.id !== annotation.id);
                      onAnnotationsChange(updatedAnnotations);
                    }}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    ✕
                  </Button>
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
        </Card>
      )}
    </div>
  );
};

export default AnnotationInterface;
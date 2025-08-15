import React, { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Palette, RotateCcw, Sparkles } from 'lucide-react';

export interface Annotation {
  id: string;
  startIndex: number;
  endIndex: number;
  relevanceLevel: 'high' | 'medium' | 'neutral' | 'low';
  text: string;
}

interface AnnotationInterfaceProps {
  content: string;
  onAnnotationsChange: (annotations: Annotation[]) => void;
  onRefinePrompt: () => void;
}

const AnnotationInterface: React.FC<AnnotationInterfaceProps> = ({
  content,
  onAnnotationsChange,
  onRefinePrompt
}) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedRelevance, setSelectedRelevance] = useState<'high' | 'medium' | 'neutral' | 'low'>('high');
  const [isSelecting, setIsSelecting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const relevanceLevels = [
    { key: 'high', label: 'High', color: 'high', description: 'Most relevant', emoji: '🔥' },
    { key: 'medium', label: 'Medium', color: 'medium', description: 'Somewhat relevant', emoji: '⚡' },
    { key: 'neutral', label: 'Neutral', color: 'neutral', description: 'Neutral', emoji: '⚪' },
    { key: 'low', label: 'Low', color: 'low', description: 'Least relevant', emoji: '❄️' }
  ] as const;

  const handleTextSelection = useCallback(() => {
    if (!isSelecting) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    if (!selectedText || !contentRef.current) return;

    // Calculate text indices
    const containerText = contentRef.current.textContent || '';
    const startIndex = containerText.indexOf(selectedText);
    const endIndex = startIndex + selectedText.length;

    if (startIndex === -1) return;

    // Create new annotation
    const newAnnotation: Annotation = {
      id: `annotation-${Date.now()}-${Math.random()}`,
      startIndex,
      endIndex,
      relevanceLevel: selectedRelevance,
      text: selectedText
    };

    const updatedAnnotations = [...annotations, newAnnotation];
    setAnnotations(updatedAnnotations);
    onAnnotationsChange(updatedAnnotations);

    // Clear selection
    selection.removeAllRanges();
  }, [annotations, selectedRelevance, isSelecting, onAnnotationsChange]);

  const clearAnnotations = () => {
    setAnnotations([]);
    onAnnotationsChange([]);
  };

  const renderAnnotatedContent = () => {
    if (annotations.length === 0) {
      return <p className="text-foreground leading-relaxed">{content}</p>;
    }

    // Sort annotations by start index
    const sortedAnnotations = [...annotations].sort((a, b) => a.startIndex - b.startIndex);
    
    let result = [];
    let lastIndex = 0;

    sortedAnnotations.forEach((annotation, index) => {
      // Add text before annotation
      if (annotation.startIndex > lastIndex) {
        result.push(
          <span key={`text-${index}`} className="text-foreground">
            {content.slice(lastIndex, annotation.startIndex)}
          </span>
        );
      }

      // Add annotated text with native heatmap styling
      result.push(
        <span
          key={annotation.id}
          className={`
            px-2 py-1 mx-0.5 rounded-md cursor-pointer
            bg-annotation-${annotation.relevanceLevel}-bg 
            hover:bg-annotation-${annotation.relevanceLevel}-hover
            border border-annotation-${annotation.relevanceLevel}/20
            shadow-sm
            transition-all duration-300 ease-out
            hover:shadow-md hover:scale-[1.02]
            relative
            before:absolute before:inset-0 before:rounded-md 
            before:bg-gradient-to-r before:from-annotation-${annotation.relevanceLevel}/5 before:to-annotation-${annotation.relevanceLevel}/10
            before:transition-opacity before:duration-300
            hover:before:opacity-75
          `}
          title={`${relevanceLevels.find(l => l.key === annotation.relevanceLevel)?.description}: "${annotation.text}"`}
        >
          <span className="relative z-10">{annotation.text}</span>
        </span>
      );

      lastIndex = annotation.endIndex;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      result.push(
        <span key="text-end" className="text-foreground">
          {content.slice(lastIndex)}
        </span>
      );
    }

    return <p className="leading-relaxed">{result}</p>;
  };

  return (
    <div className="space-y-6">
      {/* Annotation Controls */}
      <div className="flex flex-wrap items-center gap-4 p-5 bg-card rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-annotation-high to-annotation-low flex items-center justify-center">
            <Palette className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">Heatmap Level:</span>
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
                  ? `bg-annotation-${level.color} text-white border-annotation-${level.color} shadow-lg shadow-annotation-${level.color}/25` 
                  : `border-annotation-${level.color}/30 hover:bg-annotation-${level.color}-bg hover:border-annotation-${level.color}/50`
                }
              `}
            >
              <span className="mr-1">{level.emoji}</span>
              {level.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 ml-auto">
          <Button
            variant={isSelecting ? "default" : "outline"}
            size="sm"
            onClick={() => setIsSelecting(!isSelecting)}
            className="h-8"
          >
            {isSelecting ? "Stop Selecting" : "Start Selecting"}
          </Button>
          
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
            <h3 className="text-lg font-semibold text-foreground">AI Response</h3>
            <div className="flex gap-2">
              {annotations.length > 0 && (
                <>
                  <Badge variant="secondary" className="text-xs">
                    {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
                  </Badge>
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
          
          <div
            ref={contentRef}
            className={`min-h-32 text-sm ${isSelecting ? 'cursor-text select-text' : 'select-none'}`}
            onMouseUp={handleTextSelection}
          >
            {renderAnnotatedContent()}
          </div>

          {isSelecting && (
            <p className="text-xs text-muted-foreground">
              💡 Select text and it will be marked with the chosen relevance level
            </p>
          )}
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
              const count = annotations.filter(a => a.relevanceLevel === level.key).length;
              const percentage = annotations.length > 0 ? Math.round((count / annotations.length) * 100) : 0;
              return (
                <div key={level.key} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background/50 border">
                  <div className={`w-6 h-6 rounded-full bg-annotation-${level.color} shadow-lg flex items-center justify-center text-white text-xs font-bold`}>
                    {count}
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
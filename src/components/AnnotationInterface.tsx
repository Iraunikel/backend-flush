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
    { key: 'high', label: 'High', color: 'annotation-high', description: 'Most relevant' },
    { key: 'medium', label: 'Medium', color: 'annotation-medium', description: 'Somewhat relevant' },
    { key: 'neutral', label: 'Neutral', color: 'annotation-neutral', description: 'Neutral' },
    { key: 'low', label: 'Low', color: 'annotation-low', description: 'Least relevant' }
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

      // Add annotated text
      result.push(
        <span
          key={annotation.id}
          className={`px-1 py-0.5 rounded-sm bg-annotation-${annotation.relevanceLevel} bg-opacity-30 border-l-2 border-annotation-${annotation.relevanceLevel} transition-all duration-200 hover:bg-opacity-50`}
          title={`${relevanceLevels.find(l => l.key === annotation.relevanceLevel)?.description}: "${annotation.text}"`}
        >
          {annotation.text}
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
      <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Relevance Level:</span>
        </div>
        
        <div className="flex gap-2">
          {relevanceLevels.map((level) => (
            <Button
              key={level.key}
              variant={selectedRelevance === level.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRelevance(level.key as any)}
              className={`h-8 text-xs ${
                selectedRelevance === level.key 
                  ? `bg-annotation-${level.color} text-white border-annotation-${level.color}` 
                  : ''
              }`}
            >
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
        <Card className="p-4">
          <h4 className="text-sm font-medium text-foreground mb-3">Annotation Heatmap</h4>
          <div className="flex gap-4 text-xs">
            {relevanceLevels.map((level) => {
              const count = annotations.filter(a => a.relevanceLevel === level.key).length;
              return (
                <div key={level.key} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded bg-annotation-${level.color} bg-opacity-60`} />
                  <span className="text-muted-foreground">
                    {level.label} ({count})
                  </span>
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
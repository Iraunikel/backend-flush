import React, { useState } from 'react';
import FlushHeader from './FlushHeader';
import AnnotationInterface, { type Annotation } from './AnnotationInterface';
import PromptRefinement from './PromptRefinement';
import AnalyticsDashboard from './AnalyticsDashboard';

// Sample AI response for demonstration
const SAMPLE_AI_RESPONSE = `Machine learning is a subset of artificial intelligence (AI) that enables computers to learn and improve from experience without being explicitly programmed. It focuses on developing algorithms that can analyze and find patterns in data, then use those patterns to make predictions or decisions about new data.

There are three main types of machine learning: supervised learning, which uses labeled data to train models; unsupervised learning, which finds hidden patterns in unlabeled data; and reinforcement learning, which learns through trial and error by receiving rewards or penalties for actions.

Common applications include image recognition, natural language processing, recommendation systems, fraud detection, and autonomous vehicles. Popular algorithms include linear regression, decision trees, neural networks, support vector machines, and k-means clustering.

To get started with machine learning, you'll need a solid foundation in mathematics (statistics, linear algebra, calculus), programming skills (Python or R are popular choices), and familiarity with ML libraries like scikit-learn, TensorFlow, or PyTorch. Data preprocessing, feature selection, and model evaluation are crucial skills to develop.

The field is rapidly evolving with advancements in deep learning, transformer architectures, and large language models. Key challenges include ensuring model interpretability, handling bias in data, managing computational resources, and maintaining privacy and security in AI systems.`;

const SAMPLE_PROMPT = "Explain machine learning to someone who wants to get started in the field. Include the main concepts, types, applications, and what they need to learn.";

const FlushApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'annotate' | 'refine' | 'analytics'>('annotate');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  const handleAnnotationsChange = (newAnnotations: Annotation[]) => {
    setAnnotations(newAnnotations);
  };

  const handleRefinePrompt = () => {
    setActiveTab('refine');
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'annotate':
        return (
          <AnnotationInterface
            content={SAMPLE_AI_RESPONSE}
            onAnnotationsChange={handleAnnotationsChange}
            onRefinePrompt={handleRefinePrompt}
          />
        );
      case 'refine':
        return (
          <PromptRefinement
            originalPrompt={SAMPLE_PROMPT}
            originalResponse={SAMPLE_AI_RESPONSE}
            annotations={annotations}
          />
        );
      case 'analytics':
        return (
          <AnalyticsDashboard
            annotations={annotations}
            originalPrompt={SAMPLE_PROMPT}
            originalResponse={SAMPLE_AI_RESPONSE}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <FlushHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        annotationCount={annotations.length}
      />
      
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {renderActiveTab()}
        </div>
      </main>
    </div>
  );
};

export default FlushApp;
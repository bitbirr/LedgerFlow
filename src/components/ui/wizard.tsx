import React, { useState, ReactNode } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
  validation?: () => boolean | Promise<boolean>;
}

interface WizardProps {
  steps: WizardStep[];
  onComplete: () => void | Promise<void>;
  onCancel?: () => void;
  className?: string;
  title?: string;
  description?: string;
}

export function Wizard({ 
  steps, 
  onComplete, 
  onCancel, 
  className, 
  title, 
  description 
}: WizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    const step = steps[currentStep];
    
    if (step.validation) {
      setIsLoading(true);
      try {
        const isValid = await step.validation();
        if (!isValid) {
          setIsLoading(false);
          return;
        }
      } catch (error) {
        setIsLoading(false);
        return;
      }
    }

    setCompletedSteps(prev => new Set([...prev, currentStep]));

    if (currentStep === steps.length - 1) {
      try {
        await onComplete();
      } catch (error) {
        console.error('Error completing wizard:', error);
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
    
    setIsLoading(false);
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex < currentStep || completedSteps.has(stepIndex)) {
      setCurrentStep(stepIndex);
    }
  };

  const getStepStatus = (stepIndex: number) => {
    if (completedSteps.has(stepIndex)) return 'completed';
    if (stepIndex === currentStep) return 'active';
    if (stepIndex < currentStep) return 'completed';
    return 'inactive';
  };

  return (
    <div className={cn("wizard-container", className)}>
      {/* Header */}
      {(title || description) && (
        <div className="wizard-header">
          {title && (
            <h1 className="responsive-title text-gray-800 mb-2">{title}</h1>
          )}
          {description && (
            <p className="text-gray-600 responsive-body">{description}</p>
          )}
        </div>
      )}

      {/* Progress Steps */}
      <div className="wizard-progress">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => handleStepClick(index)}
                className={cn(
                  "wizard-step",
                  status,
                  "cursor-pointer hover:opacity-80 transition-opacity"
                )}
                disabled={index > currentStep && !completedSteps.has(index)}
              >
                <div className="wizard-step-number">
                  {status === 'completed' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <div className="hidden sm:block">
                  <span className="wizard-step-title">{step.title}</span>
                  {step.description && (
                    <p className="text-xs mt-1 opacity-80">{step.description}</p>
                  )}
                </div>
              </button>
              
              {index < steps.length - 1 && (
                <div className="hidden sm:block flex-1 h-px bg-gray-300 mx-4" />
              )}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="wizard-content">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {steps[currentStep].title}
          </h2>
          {steps[currentStep].description && (
            <p className="text-gray-600 text-sm">
              {steps[currentStep].description}
            </p>
          )}
        </div>
        
        <div className="wizard-form-group">
          {steps[currentStep].content}
        </div>
      </div>

      {/* Actions */}
      <div className="wizard-actions">
        <div className="flex items-center text-sm text-gray-500">
          Step {currentStep + 1} of {steps.length}
        </div>
        
        <div className="wizard-button-group">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="modern-button-outline"
            >
              Cancel
            </Button>
          )}
          
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="modern-button-secondary"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <Button
            type="button"
            onClick={handleNext}
            disabled={isLoading}
            className="modern-button-primary"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : currentStep === steps.length - 1 ? (
              "Complete"
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Form field components for wizard forms
interface WizardFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function WizardField({ 
  label, 
  error, 
  required, 
  children, 
  className 
}: WizardFieldProps) {
  return (
    <div className={cn("form-field", className)}>
      <label className="form-label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

interface WizardFormRowProps {
  children: ReactNode;
  className?: string;
}

export function WizardFormRow({ children, className }: WizardFormRowProps) {
  return (
    <div className={cn("wizard-form-row", className)}>
      {children}
    </div>
  );
}
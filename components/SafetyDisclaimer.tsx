/**
 * Safety Disclaimer Component
 * 
 * Displays the BioFlo safety disclaimer across the application.
 * Based on: BioFlo AI Safety & Prompt Specification v1.0
 */

export function SafetyDisclaimer({ variant = "default" }: { variant?: "default" | "compact" | "inline" }) {
  if (variant === "inline") {
    return (
      <p className="text-xs text-slate-400 italic">
        BioFlo does not provide medical advice, diagnosis, or treatment. It is not a substitute for a doctor or emergency services.
      </p>
    );
  }

  if (variant === "compact") {
    return (
      <div className="text-xs text-slate-400 border-t border-slate-700 pt-3 mt-4">
        <p className="font-semibold text-slate-300 mb-1">Important:</p>
        <p>
          BioFlo is not a medical service and does not provide diagnosis or emergency support. 
          For medical emergencies, call your local emergency number immediately.
        </p>
      </div>
    );
  }

  // Default variant
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
      <p className="text-sm text-slate-300 font-semibold mb-2">⚠️ Important Disclaimer</p>
      <p className="text-xs text-slate-400 leading-relaxed">
        BioFlo does not provide medical advice, diagnosis, or treatment. It is not a substitute for a doctor or emergency services.
        For medical emergencies, call your local emergency number immediately. For mental health crises, contact your local crisis hotline.
        Always consult with qualified healthcare professionals before making significant changes to your health routine.
      </p>
    </div>
  );
}


import { z } from "zod";

export type ToolContext = {
  userId: string;
  requestId?: string;
};

export type ToolDef<I, O> = {
  name: string;
  description: string;
  input: z.ZodType<I>;
  handler: (args: I, context: ToolContext) => Promise<O>;
};

const registry: Record<string, ToolDef<any, any>> = {};

export function registerTool<I, O>(def: ToolDef<I, O>) {
  registry[def.name] = def;
  return def;
}

export function getTool(name: string) {
  return registry[name];
}

export function listTools() {
  return Object.values(registry);
}

/**
 * Simple detector to trigger tools without full function-calling.
 * Returns the tool name + parsed args if a known pattern is recognized.
 * (We can upgrade to real tool-calling later.)
 */
export function detectToolFromUserText(text: string): { name: string; args: unknown } | null {
  const t = text.toLowerCase();

  // Experiment system triggers
  const mentionsExperiment = /(experiment|self[-\s]?experiment|n\s*=\s*1|trial)/i.test(text);
  if (mentionsExperiment) {
    const wantsList = /(list|show|what|which|view|see).*(experiment|trial)/i.test(text);
    if (wantsList) {
      const includeCompleted = /(completed|finished|past|old|previous)/i.test(text);
      const limit = /(all|everything|full)/i.test(text) ? 20 : 5;
      const statusMatch = /(active|current|running|live)/i.test(text)
        ? "active"
        : /(draft|planned)/i.test(text)
        ? "draft"
        : undefined;
      return {
        name: "listExperiments",
        args: {
          includeCompleted,
          limit,
          status: statusMatch,
        },
      };
    }

    const wantsAnalysis = /(analy[sz]e|analysis|result|insight|verdict|compare|review).*(experiment|trial)/i.test(
      text
    );
    if (wantsAnalysis) {
      const experimentName = extractExperimentName(text);
      if (!experimentName) {
        return null;
      }
      return {
        name: "analyzeExperiment",
        args: {
          experimentName,
        },
      };
    }

    const wantsCreation = /(create|design|build|start|run|launch|plan|set\s*up|spin\s*up|kick\s*off)/i.test(text);
    if (wantsCreation) {
      const experimentName = extractExperimentName(text) ?? deriveExperimentNameFallback(text);
      const durationDays = inferExperimentDuration(text);
      const metrics = inferExperimentMetrics(text);
      return {
        name: "createExperiment",
        args: {
          name: experimentName,
          description: text.trim().slice(0, 500),
          durationDays,
          metrics,
        },
      };
    }
  }

  // mealPlanner triggers
  const mealTriggers = /(meal plan|mealplan|plan my meals|macros|calorie|calories|daily menu|nutrition plan)/i.test(t);
  const cals = /(\d{3,4})\s?kcal|\b(\d{3,4})\s?cal\b/i.exec(text);
  if (mealTriggers) {
    const calories = Number(cals?.[1] || cals?.[2] || 2000);
    // crude prefs/exclusions parse
    const pesc = /pesc(etarian)?/i.test(text) ? "pescatarian" : undefined;
    const vegan = /vegan/i.test(text) ? "vegan" : undefined;
    const keto = /keto/i.test(text) ? "keto" : undefined;
    const excludes: string[] = [];
    if (/no nuts|avoid nuts/i.test(text)) excludes.push("nuts");
    if (/no dairy|avoid dairy/i.test(text)) excludes.push("dairy");
    return {
      name: "mealPlanner",
      args: {
        calories,
        dietaryPrefs: [pesc, vegan, keto].filter(Boolean),
        exclusions: excludes,
      }
    };
  }

  // supplementRecommender triggers
  const supplementTriggers = /(supplement|supplements|supplement stack|stack|nootropic|nootropics|vitamin|vitamins|recommend.*supplement|what.*supplement|need.*supplement)/i.test(t);
  if (supplementTriggers) {
    const goals: string[] = [];
    if (/(sleep|insomnia|sleep quality|better sleep)/i.test(t)) goals.push("sleep");
    if (/(longevity|anti.?aging|age|live longer)/i.test(t)) goals.push("longevity");
    if (/(performance|athletic|workout|exercise|training|strength|endurance)/i.test(t)) goals.push("performance");
    if (/(recovery|muscle recovery|post.?workout)/i.test(t)) goals.push("recovery");
    if (/(stress|anxiety|cortisol|calm|relax)/i.test(t)) goals.push("stress");
    if (/(cognitive|brain|memory|focus|mental|nootropic)/i.test(t)) goals.push("cognitive");
    if (/(methylation|mthfr|b12|genetic)/i.test(t)) goals.push("methylation");
    
    // Default to general if no specific goals
    if (goals.length === 0) goals.push("general");

    const budget = /(low budget|cheap|affordable)/i.test(t) ? "low" :
                   /(high budget|expensive|premium)/i.test(t) ? "high" :
                   /(unlimited|no budget)/i.test(t) ? "unlimited" : "medium";

    const experience = /(beginner|new to|just starting|first time)/i.test(t) ? "beginner" :
                       /(advanced|expert|experienced)/i.test(t) ? "advanced" : "intermediate";

    return {
      name: "supplementRecommender",
      args: {
        goals,
        budget,
        experience,
        currentSupplements: [],
        avoidInteractions: [],
      }
    };
  }

  // sleepOptimizer triggers - only trigger when explicitly asking for a plan/protocol
  // Don't trigger on general sleep questions (those should go to chat with Sleep Coach)
  const explicitSleepPlan = /(sleep.*(plan|protocol|schedule|program|routine|optimization)|plan.*sleep|create.*sleep|give.*me.*sleep|make.*sleep|build.*sleep|design.*sleep)/i.test(t);
  const sleepOptimizationRequest = /(optimize.*sleep|improve.*sleep.*schedule|fix.*sleep.*routine|sleep.*optimization)/i.test(t);
  
  // Only trigger tool if explicitly requesting a plan/protocol, not just asking questions
  if (explicitSleepPlan || sleepOptimizationRequest) {
    const sleepIssues: string[] = [];
    if (/(falling.*asleep|can't.*fall.*asleep|trouble.*falling)/i.test(t)) sleepIssues.push("falling_asleep");
    if (/(staying.*asleep|wake.*up|can't.*stay)/i.test(t)) sleepIssues.push("staying_asleep");
    if (/(waking.*early|wake.*too.*early)/i.test(t)) sleepIssues.push("waking_early");
    if (/(poor.*quality|restless|unrefreshed)/i.test(t)) sleepIssues.push("poor_quality");
    if (/(fatigue|tired|exhausted)/i.test(t)) sleepIssues.push("fatigue");

    const goals: string[] = [];
    if (/(better.*sleep|improve.*sleep|sleep.*quality)/i.test(t)) goals.push("better_sleep");
    if (/(energy|energetic)/i.test(t)) goals.push("energy");
    if (/(performance|athletic)/i.test(t)) goals.push("performance");
    if (/(recovery)/i.test(t)) goals.push("recovery");

    return {
      name: "sleepOptimizer",
      args: {
        currentSleepSchedule: {
          sleepIssues: sleepIssues.length > 0 ? sleepIssues : undefined,
        },
        goals: goals.length > 0 ? goals : ["better_sleep"],
      }
    };
  }

  // womensHealth triggers
  const womensHealthTriggers = /(women|female|woman|menstrual|cycle|hormone|hormonal|pcos|menopause|period|pms|fertility|ovulation|luteal|follicular)/i.test(t) &&
                                /(protocol|plan|program|optimize|support|help|recommend)/i.test(t);
  
  if (womensHealthTriggers) {
    const goals: string[] = [];
    if (/(hormonal|hormone.*balance|balance.*hormone)/i.test(t)) goals.push("hormonal_balance");
    if (/(cycle|menstrual.*cycle|optimize.*cycle)/i.test(t)) goals.push("cycle_optimization");
    if (/(pcos)/i.test(t)) goals.push("pcos");
    if (/(menopause|menopausal)/i.test(t)) goals.push("menopause");
    if (/(fertility|fertile|conceive)/i.test(t)) goals.push("fertility");
    if (/(energy|energetic)/i.test(t)) goals.push("energy");
    if (/(performance|athletic)/i.test(t)) goals.push("performance");
    if (/(weight|weight.*loss|weight.*management)/i.test(t)) goals.push("weight_management");
    if (/(mood|mood.*swing)/i.test(t)) goals.push("mood");
    if (/(libido|sex.*drive)/i.test(t)) goals.push("libido");

    if (goals.length === 0) {
      goals.push("hormonal_balance", "cycle_optimization");
    }

    const cyclePhase = /(menstrual|period|bleeding)/i.test(t) ? "menstrual" :
                       /(follicular)/i.test(t) ? "follicular" :
                       /(ovulation|ovulatory)/i.test(t) ? "ovulatory" :
                       /(luteal|pms)/i.test(t) ? "luteal" : undefined;

    const issues: string[] = [];
    if (/(irregular|irregular.*cycle)/i.test(t)) issues.push("irregular");
    if (/(heavy.*bleeding|heavy.*period)/i.test(t)) issues.push("heavy_bleeding");
    if (/(cramp|cramping)/i.test(t)) issues.push("cramps");
    if (/(pms)/i.test(t)) issues.push("pms");
    if (/(mood.*swing|mood.*change)/i.test(t)) issues.push("mood_swings");
    if (/(low.*libido|low.*sex.*drive)/i.test(t)) issues.push("low_libido");

    return {
      name: "womensHealth",
      args: {
        goals,
        cycleInfo: {
          currentPhase: cyclePhase,
          issues: issues.length > 0 ? issues : undefined,
        },
      }
    };
  }

  // recoveryOptimizer triggers
  const recoveryTriggers = /(recovery|recover|post.*workout|muscle.*sore|soreness|fatigue|tired.*after.*workout)/i.test(t) &&
                          /(protocol|plan|program|routine|schedule|optimize|improve|help|recommend)/i.test(t);
  
  if (recoveryTriggers) {
    const workoutType = /(strength|weight.*lift|resistance)/i.test(t) ? "strength" :
                       /(cardio|running|cycling|aerobic)/i.test(t) ? "cardio" :
                       /(hiit|high.*intensity|interval)/i.test(t) ? "hiit" :
                       /(endurance|long.*distance|marathon)/i.test(t) ? "endurance" :
                       /(sport|soccer|basketball|tennis)/i.test(t) ? "sport" : "mixed";
    
    const intensity = /(very.*high|extreme|intense)/i.test(t) ? "very_high" :
                     /(high|hard|tough)/i.test(t) ? "high" :
                     /(low|easy|light)/i.test(t) ? "low" : "moderate";
    
    const recoveryTime = /(same.*day|today|later.*today)/i.test(t) ? "same_day" :
                        /(48.*hour|two.*day)/i.test(t) ? "48_hours" :
                        /(72.*hour|three.*day)/i.test(t) ? "72_hours" : "next_day";
    
    const sleepQuality = /(poor|bad|terrible|awful)/i.test(t) ? "poor" :
                        /(fair|okay|ok|so.*so)/i.test(t) ? "fair" :
                        /(excellent|great|perfect)/i.test(t) ? "excellent" : "good";
    
    const goals: string[] = [];
    if (/(muscle.*gain|build.*muscle|gain.*muscle)/i.test(t)) goals.push("muscle_gain");
    if (/(endurance|stamina)/i.test(t)) goals.push("endurance");
    if (/(performance|athletic)/i.test(t)) goals.push("performance");
    if (/(fatigue|tired|exhausted)/i.test(t)) goals.push("fatigue_reduction");
    if (/(injury|prevent.*injury|avoid.*injury)/i.test(t)) goals.push("injury_prevention");
    
    if (goals.length === 0) goals.push("performance");
    
    return {
      name: "recoveryOptimizer",
      args: {
        workoutType,
        intensity,
        recoveryTime,
        sleepQuality,
        stressLevel: "moderate",
        goals,
      },
    };
  }

  // macroCalculator triggers
  const macroTriggers = /(macro|macros|macronutrient|calorie|calories|protein|carbs|carbohydrate|fat|calculate|need.*calories|how.*many.*calories)/i.test(t) &&
                        /(calculate|need|want|should|recommend|target|goal)/i.test(t);
  
  if (macroTriggers) {
    const goal = /(weight.*loss|lose.*weight|fat.*loss|cut)/i.test(t) ? "weight_loss" :
                /(muscle.*gain|build.*muscle|bulk|gain.*weight)/i.test(t) ? "muscle_gain" :
                /(performance|athletic|training)/i.test(t) ? "performance" :
                /(recomp|body.*recomp|maintain.*muscle)/i.test(t) ? "body_recomposition" : "maintenance";
    
    const activity = /(athlete|very.*active|intense.*training)/i.test(t) ? "athlete" :
                    /(very.*active|high.*activity)/i.test(t) ? "very_active" :
                    /(active|moderate.*activity|exercise.*regular)/i.test(t) ? "active" :
                    /(moderate|some.*exercise|light.*activity)/i.test(t) ? "moderate" :
                    /(light|sedentary|desk.*job|low.*activity)/i.test(t) ? "light" : "sedentary";
    
    const diet = /(keto|ketogenic|low.*carb)/i.test(t) ? "keto" :
                /(low.*carb|low.*carbohydrate)/i.test(t) ? "low_carb" :
                /(high.*carb|high.*carbohydrate)/i.test(t) ? "high_carb" :
                /(high.*protein|protein.*rich)/i.test(t) ? "high_protein" :
                /(paleo|paleolithic)/i.test(t) ? "paleo" : "standard";
    
    // Try to extract weight
    const weightMatch = /(\d{2,3})\s*(kg|kilo|pound|lb|lbs)/i.exec(t);
    const weight = weightMatch ? parseFloat(weightMatch[1]) : 70; // Default 70kg
    
    // Convert pounds to kg if needed
    const weightKg = /(pound|lb|lbs)/i.test(weightMatch?.[2] || "") ? weight * 0.453592 : weight;
    
    return {
      name: "macroCalculator",
      args: {
        goal,
        activityLevel: activity,
        bodyStats: {
          weight: weightKg,
        },
        dietaryPreference: diet,
        mealsPerDay: 3,
      },
    };
  }

  // stressManagement triggers
  const stressTriggers = /(stress|anxiety|calm|relax|breathing|meditation|hrv|heart.*rate.*variability|cortisol|overwhelm|panic)/i.test(t) &&
                        /(protocol|plan|program|routine|schedule|manage|reduce|help|technique|exercise)/i.test(t);
  
  if (stressTriggers) {
    const stressLevel = /(chronic|severe|very.*high|extreme)/i.test(t) ? "chronic" :
                       /(high|elevated|significant)/i.test(t) ? "high" :
                       /(low|minimal|little)/i.test(t) ? "low" : "moderate";
    
    const goals: string[] = [];
    if (/(reduce.*stress|manage.*stress|lower.*stress)/i.test(t)) goals.push("reduce_stress");
    if (/(sleep|sleep.*quality|better.*sleep)/i.test(t)) goals.push("improve_sleep");
    if (/(focus|concentration|mental.*clarity)/i.test(t)) goals.push("enhance_focus");
    if (/(anxiety|panic|worry)/i.test(t)) goals.push("manage_anxiety");
    if (/(hrv|heart.*rate.*variability|recovery)/i.test(t)) goals.push("improve_hrv");
    if (/(cortisol|hormone|hormonal)/i.test(t)) goals.push("cortisol_optimization");
    
    if (goals.length === 0) goals.push("reduce_stress");
    
    const timeAvailable = /(minimal|little.*time|busy|quick)/i.test(t) ? "minimal" :
                         /(extensive|lots.*time|plenty.*time)/i.test(t) ? "extensive" : "moderate";
    
    return {
      name: "stressManagement",
      args: {
        stressLevel,
        goals,
        timeAvailable,
        preferences: {
          breathing: !/(no.*breathing|skip.*breathing)/i.test(t),
          meditation: !/(no.*meditation|skip.*meditation)/i.test(t),
          exercise: !/(no.*exercise|skip.*exercise)/i.test(t),
          supplements: !/(no.*supplement|skip.*supplement|no.*supp)/i.test(t),
        },
      },
    };
  }

  // coldHotTherapy triggers
  const coldHotTriggers = /(cold.*plunge|cold.*exposure|cold.*shower|sauna|ice.*bath|contrast.*therapy|hot.*cold|huberman.*cold)/i.test(t) &&
                          /(protocol|plan|program|routine|schedule|start|begin|create|build|generate|recommend)/i.test(t);
  
  if (coldHotTriggers) {
    const experience = /(beginner|new|just.*starting|first.*time)/i.test(t) ? "beginner" :
                      /(advanced|expert|experienced|long.*time)/i.test(t) ? "advanced" : "intermediate";
    
    const goals: string[] = [];
    if (/(recovery|recover|muscle.*sore)/i.test(t)) goals.push("recovery");
    if (/(mood|dopamine|feel.*good|happiness)/i.test(t)) goals.push("mood");
    if (/(metabolism|metabolic|burn.*fat|weight)/i.test(t)) goals.push("metabolism");
    if (/(performance|athletic|workout|training)/i.test(t)) goals.push("performance");
    if (/(stress|anxiety|cortisol|calm)/i.test(t)) goals.push("stress_reduction");
    if (/(immune|immunity|health)/i.test(t)) goals.push("immune_support");
    
    if (goals.length === 0) goals.push("recovery");
    
    const hasColdPlunge = /(cold.*plunge|ice.*bath|plunge)/i.test(t);
    const hasSauna = /(sauna|steam)/i.test(t);
    const hasColdShower = /(cold.*shower|shower)/i.test(t) || !hasColdPlunge;
    const hasContrast = /(contrast|alternat|hot.*cold|cold.*hot)/i.test(t);
    
    return {
      name: "coldHotTherapy",
      args: {
        experienceLevel: experience,
        goals,
        access: {
          coldPlunge: hasColdPlunge,
          sauna: hasSauna,
          coldShower: hasColdShower,
          contrast: hasContrast || (hasSauna && (hasColdPlunge || hasColdShower)),
        },
      },
    };
  }

  // fastingPlanner triggers
  const fastingTriggers = /(fast|fasting|intermittent.*fast|if|omad|16:8|18:6|5:2|time.*restricted.*eating|tre)/i.test(t) &&
                          /(protocol|plan|program|routine|schedule|start|begin|create|build|generate|recommend)/i.test(t);
  
  if (fastingTriggers) {
    const experience = /(beginner|new|just.*starting|first.*time)/i.test(t) ? "beginner" :
                      /(advanced|expert|experienced|long.*time)/i.test(t) ? "advanced" : "intermediate";
    
    const goals: string[] = [];
    if (/(weight.*loss|lose.*weight|fat.*loss)/i.test(t)) goals.push("weight_loss");
    if (/(autophagy|cellular.*repair|cell.*repair)/i.test(t)) goals.push("autophagy");
    if (/(metabolic|metabolism|insulin|blood.*sugar)/i.test(t)) goals.push("metabolic_health");
    if (/(mental.*clarity|focus|brain|cognitive)/i.test(t)) goals.push("mental_clarity");
    if (/(longevity|live.*longer|anti.*aging)/i.test(t)) goals.push("longevity");
    if (/(performance|athletic|workout|training)/i.test(t)) goals.push("performance");
    
    if (goals.length === 0) goals.push("metabolic_health");
    
    const activity = /(athlete|athletic|high.*activity|very.*active)/i.test(t) ? "athlete" :
                     /(moderate|moderately.*active|some.*exercise)/i.test(t) ? "moderate" :
                     /(sedentary|desk.*job|low.*activity)/i.test(t) ? "sedentary" : "moderate";
    
    const preferredWindow = /(\d{1,2}):(\d{2})\s*(am|pm).*(\d{1,2}):(\d{2})\s*(am|pm)/i.exec(t);
    
    return {
      name: "fastingPlanner",
      args: {
        experienceLevel: experience,
        goals,
        activityLevel: activity,
        scheduleConstraints: preferredWindow ? {
          preferredEatingWindow: preferredWindow[0],
        } : undefined,
      },
    };
  }

  // healthLogger triggers - log health data
  const healthLogTriggers = /(log|record|track|enter|input|save).*(sleep|blood.*pressure|weight|heart.*rate|glucose|steps|mood|energy|hrv)/i.test(t) ||
                            /(my|i).*(slept|weigh|blood.*pressure|heart.*rate|glucose|steps|walked).*(was|is|had|got|did)/i.test(t) ||
                            /(\d+)\s*(hours.*sleep|steps|bpm|mg\/dl|kg|lbs|pounds)/i.test(t);

  if (healthLogTriggers) {
    // Parse various health metrics from the text
    const data: Record<string, number | string | undefined> = {};
    
    // Sleep
    const sleepMatch = /(\d+\.?\d*)\s*(hours?|hrs?)\s*(of\s*)?(sleep|slept)/i.exec(t) || 
                       /(slept|sleep)\s*(?:for\s*)?(\d+\.?\d*)\s*(hours?|hrs?)/i.exec(t);
    if (sleepMatch) {
      const hours = parseFloat(sleepMatch[1] || sleepMatch[2]);
      if (hours > 0 && hours <= 24) data.sleepHours = hours;
    }
    
    // Sleep quality
    const sleepQualityMatch = /sleep.*quality\s*(?:was|is|:)?\s*(\d{1,2})/i.exec(t) ||
                              /(\d{1,2})\s*(?:out\s*of\s*10|\/10).*sleep/i.exec(t);
    if (sleepQualityMatch) {
      const quality = parseInt(sleepQualityMatch[1]);
      if (quality >= 1 && quality <= 10) data.sleepQuality = quality;
    }
    
    // Blood pressure
    const bpMatch = /(\d{2,3})\s*[\/\\over]\s*(\d{2,3})/i.exec(t);
    if (bpMatch) {
      const systolic = parseInt(bpMatch[1]);
      const diastolic = parseInt(bpMatch[2]);
      if (systolic >= 70 && systolic <= 250 && diastolic >= 40 && diastolic <= 150) {
        data.bloodPressureSystolic = systolic;
        data.bloodPressureDiastolic = diastolic;
      }
    }
    
    // Weight
    const weightMatch = /(\d{2,3}\.?\d*)\s*(kg|kilo|kilogram|lbs?|pounds?)/i.exec(t) ||
                        /(weigh|weight)\s*(?:is|was|:)?\s*(\d{2,3}\.?\d*)/i.exec(t);
    if (weightMatch) {
      let weight = parseFloat(weightMatch[1] || weightMatch[2]);
      if (/(lbs?|pounds?)/i.test(weightMatch[2] || "")) weight *= 0.453592;
      if (weight >= 20 && weight <= 300) data.weight = Math.round(weight * 10) / 10;
    }
    
    // Heart rate
    const hrMatch = /(\d{2,3})\s*(bpm|beats)/i.exec(t) ||
                    /(heart\s*rate|hr|resting.*hr)\s*(?:is|was|:)?\s*(\d{2,3})/i.exec(t);
    if (hrMatch) {
      const hr = parseInt(hrMatch[1] || hrMatch[2]);
      if (hr >= 30 && hr <= 220) data.restingHeartRate = hr;
    }
    
    // Blood glucose
    const glucoseMatch = /(\d{2,3})\s*(mg\/dl|mgdl)/i.exec(t) ||
                         /(glucose|blood\s*sugar)\s*(?:is|was|:)?\s*(\d{2,3})/i.exec(t);
    if (glucoseMatch) {
      const glucose = parseInt(glucoseMatch[1] || glucoseMatch[2]);
      if (glucose >= 20 && glucose <= 600) data.bloodGlucose = glucose;
    }
    
    // Steps
    const stepsMatch = /(\d{3,6})\s*steps/i.exec(t) ||
                       /(walked|steps)\s*(?:was|were|:)?\s*(\d{3,6})/i.exec(t);
    if (stepsMatch) {
      const steps = parseInt(stepsMatch[1] || stepsMatch[2]);
      if (steps >= 0 && steps <= 100000) data.steps = steps;
    }
    
    // Energy level
    const energyMatch = /energy\s*(?:level|:)?\s*(?:is|was)?\s*(\d{1,2})/i.exec(t) ||
                        /(\d{1,2})\s*(?:out\s*of\s*10|\/10).*energy/i.exec(t);
    if (energyMatch) {
      const energy = parseInt(energyMatch[1]);
      if (energy >= 1 && energy <= 10) data.energyLevel = energy;
    }
    
    // Mood
    const moodMatch = /mood\s*(?:is|was|:)?\s*(\d{1,2})/i.exec(t) ||
                      /(\d{1,2})\s*(?:out\s*of\s*10|\/10).*mood/i.exec(t);
    if (moodMatch) {
      const mood = parseInt(moodMatch[1]);
      if (mood >= 1 && mood <= 10) data.moodScore = mood;
    }
    
    // Water/hydration
    const waterMatch = /(\d{3,4})\s*(ml|milliliter|liter|L)\s*(of\s*)?(water)?/i.exec(t) ||
                       /(drank|water)\s*(\d{1,2})\s*(glasses|cups|liters?|L)/i.exec(t);
    if (waterMatch) {
      let ml = parseInt(waterMatch[1] || waterMatch[2]);
      if (/(glasses?|cups?)/i.test(waterMatch[3] || "")) ml *= 250;
      if (/(liters?|L)/i.test(waterMatch[2] || waterMatch[3] || "")) ml *= 1000;
      if (ml >= 0 && ml <= 10000) data.waterMl = ml;
    }

    // Only trigger if we found any data to log
    if (Object.keys(data).length > 0) {
      return {
        name: "logHealthData",
        args: data,
      };
    }
  }

  // protocolBuilder triggers (comprehensive protocol generation)
  const protocolTriggers = /(protocol|plan|program|routine|schedule).*(for|to|optimize|achieve|longevity|performance|weight|muscle|energy|stress|cognitive)/i.test(t) ||
                          /(create|build|generate|make).*(protocol|plan|program|routine|schedule)/i.test(t) ||
                          /(biohack|optimize).*(protocol|plan|program)/i.test(t);
  
  if (protocolTriggers && !womensHealthTriggers && !fastingTriggers) {
    const goals: string[] = [];
    if (/(longevity|live.*longer|anti.?aging)/i.test(t)) goals.push("longevity");
    if (/(performance|athletic|workout|training)/i.test(t)) goals.push("performance");
    if (/(weight.*loss|lose.*weight|fat.*loss)/i.test(t)) goals.push("weight_loss");
    if (/(muscle.*gain|build.*muscle|gain.*muscle)/i.test(t)) goals.push("muscle_gain");
    if (/(energy|energetic|energy.*levels)/i.test(t)) goals.push("energy");
    if (/(sleep|sleep.*quality|better.*sleep)/i.test(t)) goals.push("sleep");
    if (/(stress|stress.*reduction|anxiety|cortisol)/i.test(t)) goals.push("stress_reduction");
    if (/(cognitive|brain|memory|focus|mental)/i.test(t)) goals.push("cognitive_enhancement");
    if (/(recovery|recover)/i.test(t)) goals.push("recovery");
    if (/(hormone|hormonal|testosterone|estrogen)/i.test(t)) goals.push("hormonal_optimization");

    // Default goals if none detected
    if (goals.length === 0) {
      goals.push("energy", "sleep");
    }

    // Duration
    const duration = /(1.*week|one.*week)/i.test(t) ? "1_week" :
                     /(2.*week|two.*week)/i.test(t) ? "2_weeks" :
                     /(8.*week|eight.*week)/i.test(t) ? "8_weeks" :
                     /(12.*week|three.*month|3.*month)/i.test(t) ? "12_weeks" : "4_weeks";

    // Preferences
    const fasting = /(fast|fasting|intermittent.*fast|if)/i.test(t);
    const vegan = /(vegan|plant.*based)/i.test(t);
    const budget = /(low.*budget|cheap|affordable)/i.test(t) ? "low" :
                   /(high.*budget|premium|expensive)/i.test(t) ? "high" : "medium";
    const experience = /(beginner|new|just.*starting)/i.test(t) ? "beginner" :
                       /(advanced|expert|experienced)/i.test(t) ? "advanced" : "intermediate";
    const timeAvailable = /(minimal|little.*time|busy)/i.test(t) ? "minimal" :
                          /(extensive|lots.*time|plenty.*time)/i.test(t) ? "extensive" : "moderate";

    return {
      name: "protocolBuilder",
      args: {
        goals,
        duration,
        preferences: {
          fasting,
          vegan,
          budget,
          experience,
          timeAvailable,
        },
      }
    };
  }

  return null;
}

function extractExperimentName(source: string): string | null {
  const named = source.match(/(?:called|named)\s+["'“]?([^"”'\n]+)["'”]?/i);
  if (named) {
    const formatted = formatExperimentName(named[1]);
    if (formatted) return formatted;
  }

  const before = source.match(
    /(?:create|design|build|start|launch|plan|run|set\s*up|spin\s*up|kick\s*off)\s+(?:a|an|the)?\s+([^.,\n]+?)\s+(?:experiment|trial)/i
  );
  if (before) {
    const formatted = formatExperimentName(before[1]);
    if (formatted) return formatted;
  }

  const after = source.match(/(?:experiment|trial)\s+(?:for|to)\s+([^.,\n]+)/i);
  if (after) {
    const formatted = formatExperimentName(after[1]);
    if (formatted) return formatted;
  }

  return null;
}

function deriveExperimentNameFallback(source: string): string {
  if (/caffeine|coffee/i.test(source)) return "Caffeine Curfew Experiment";
  if (/sleep|insomnia|circadian/i.test(source)) return "Sleep Optimization Experiment";
  if (/stress|anxiety|calm/i.test(source)) return "Stress Reset Experiment";
  if (/sauna|cold|ice|plunge|heat/i.test(source)) return "Thermal Stress Experiment";
  if (/fast|glucose|metabolic|blood sugar/i.test(source)) return "Metabolic Reset Experiment";
  if (/focus|deep work|productivity/i.test(source)) return "Focus Sprint Experiment";
  return "Custom Experiment";
}

function formatExperimentName(raw: string): string | null {
  const cleaned = raw.replace(/[^a-z0-9\s-]/gi, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .slice(0, 80);
}

function inferExperimentDuration(source: string): number {
  const match = source.match(/(\d{1,3})\s*(day|days|week|weeks)/i);
  if (!match) return 14;
  let days = Number(match[1]);
  if (/week/i.test(match[2])) {
    days *= 7;
  }
  return Math.max(5, Math.min(days, 180));
}

function inferExperimentMetrics(source: string): string[] {
  const metrics = new Set<string>();
  if (/sleep|insomnia|circadian/i.test(source)) {
    metrics.add("sleep_duration_hours");
    metrics.add("sleep_quality");
  }
  if (/energy|fatigue|tired/i.test(source)) {
    metrics.add("energy");
  }
  if (/mood|anxiety|stress/i.test(source)) {
    metrics.add("mood");
  }
  if (/hrv|readiness|recovery/i.test(source)) {
    metrics.add("hrv_rmssd");
  }
  if (/resting\s?hr|heart\s?rate/i.test(source)) {
    metrics.add("resting_hr");
  }
  if (/steps|walk|movement|activity/i.test(source)) {
    metrics.add("steps");
  }
  if (/strain|training load|workout/i.test(source)) {
    metrics.add("strain_load");
  }

  if (metrics.size === 0) {
    metrics.add("mood");
    metrics.add("energy");
  }

  return Array.from(metrics);
}

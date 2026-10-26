import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ShieldCheck,
  Package,
  Layers,
  Scissors
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface StageDefinition {
  id: number;
  key: string;
  name: string;
  tamilName: string;
  tagline: string;
  description: string;
  craftDetails: string;
  colorTheme: string;
  accentColor: string;
}

export const SAREE_STAGES_EN: StageDefinition[] = [
  {
    id: 0,
    key: 'raw-materials',
    name: '1. Raw Materials',
    tamilName: 'Yarn & Zari Spools',
    tagline: 'Mulberry Silk & Zari Spools',
    description: 'Cotton and pure mulberry silk yarn cones appear alongside silver-gilt zari thread spools, prepared for high-tension winding.',
    craftDetails: 'Grade 3A+ Mulberry Silk Hanks (20/22 denier) and tested 24kt gold-plated silver bullion filament.',
    colorTheme: '#E6D5AD',
    accentColor: '#D4AF37'
  },
  {
    id: 1,
    key: 'dyeing',
    name: '2. Dyeing',
    tamilName: 'Vat Color Infusion',
    tagline: 'Colorfast Vat Infusion',
    description: 'Thread hanks submerge into boiling temperature-controlled dye vats, transforming raw ivory fibers into brilliant royal crimson, peacock cyan, and saffron.',
    craftDetails: 'Laboratory formulation for colorfastness Grade 4.5+ with organic fixing salts and soft water rinse.',
    colorTheme: '#EF4444',
    accentColor: '#F87171'
  },
  {
    id: 2,
    key: 'warping',
    name: '3. Warping (Vaarpu)',
    tamilName: 'Vaarpu Alignment',
    tagline: 'High-Tensile Warp Alignment',
    description: 'Dyed threads are wound around circular rotating Vaarpu drums, aligned through reed teeth, and stretched over the long warp frame with uniform tension.',
    craftDetails: '4,800 warp ends stretched over a 24-yard beam; separate border warp threads tensioned for double Korvai interlock.',
    colorTheme: '#38BDF8',
    accentColor: '#00C9A7'
  },
  {
    id: 3,
    key: 'weaving',
    name: '4. Weaving',
    tamilName: 'Handloom & Korvai',
    tagline: 'Loom & Korvai Interlock',
    description: 'Heddles lift while flying shuttles traverse the shed, intertwining weft and zari threads into an intricate temple border and pallu motif.',
    craftDetails: 'Traditional pit handloom with two weavers handling side shuttles to lock borders seamlessly into the saree body.',
    colorTheme: '#D4AF37',
    accentColor: '#C6A15B'
  },
  {
    id: 4,
    key: 'finishing-qc',
    name: '5. Finishing & Quality Check',
    tamilName: 'Inspection & Press',
    tagline: 'Silk Mark Inspection',
    description: 'The woven saree is unfurled over an inspection bridge, scanned for thread density, smoothed, fringe-knotted, and authenticated with a Silk Mark certification seal.',
    craftDetails: '100% manual surface defect inspection, thread trimming, soft steam calender finishing, and Silk Mark authentication.',
    colorTheme: '#10B981',
    accentColor: '#34D399'
  },
  {
    id: 5,
    key: 'packing',
    name: '6. Packing',
    tamilName: 'Boutique Packaging',
    tagline: 'Luxury Textile Packaging',
    description: 'The pristine saree is folded into crisp ceremonial pleats, cushioned with acid-free butter paper, and encased in the signature gold-embossed presentation box.',
    craftDetails: 'Anti-tarnish packaging to preserve gold zari luster, barcode tagging, and tamper-evident boutique ribbon seal.',
    colorTheme: '#64152F',
    accentColor: '#D4AF37'
  }
];

export const SAREE_STAGES_TA: StageDefinition[] = [
  {
    id: 0,
    key: 'raw-materials',
    name: '1. மூலப்பொருட்கள்',
    tamilName: 'நூல் & ஜரிகை சுருள்கள்',
    tagline: 'மல்பெரி பட்டு & ஜரிகை நூல்கள்',
    description: 'பருத்தி மற்றும் தூய மல்பெரி பட்டு நூல் கூம்புகள் சில்வர்-கில்ட் ஜரிகை நூல் சுருள்களுடன் உயர்-பதற்ற முறுக்குதலுக்காகத் தயாராகத் தோன்றுகின்றன.',
    craftDetails: 'தரம் 3A+ மல்பெரி பட்டு இழைகள் (20/22 டெனியர்) மற்றும் பரிசோதிக்கப்பட்ட 24 காரட் தங்க முலாம் பூசப்பட்ட வெள்ளி கம்பி இழை.',
    colorTheme: '#E6D5AD',
    accentColor: '#D4AF37'
  },
  {
    id: 1,
    key: 'dyeing',
    name: '2. சாயம் ஏற்றுதல்',
    tamilName: 'வர்ண சாயம் உட்செலுத்துதல்',
    tagline: 'நிறம் மங்காத சாயம் ஏற்றுதல்',
    description: 'நூல் இழைகள் கொதிக்கும் வெப்பநிலை கட்டுப்பாட்டு சாயம் தொட்டிகளில் மூழ்கி, மூல ஐவரி இழைகளை அடர் சிவப்பு, மயில் நீலம் மற்றும் குங்குமப்பூ நிறங்களாக மாற்றுகின்றன.',
    craftDetails: 'கரிம நிலைப்படுத்தும் உப்புகள் மற்றும் மென்மையான நீர் அலசுதலுடன் நிற நிலைத்தன்மை தரம் 4.5+ க்கான ஆய்வக சூத்திரம்.',
    colorTheme: '#EF4444',
    accentColor: '#F87171'
  },
  {
    id: 2,
    key: 'warping',
    name: '3. பாவு தயாரித்தல் (வார்ப்பு)',
    tamilName: 'வார்ப்பு சீரமைப்பு',
    tagline: 'உயர்-இழுவிசை பாவு சீரமைப்பு',
    description: 'சாயமிடப்பட்ட நூல்கள் வட்ட சுழலும் வார்ப்பு டிரம்களைச் சுற்றி சுற்றப்பட்டு, சீரான அழுத்தத்துடன் நீண்ட பாவு சட்டத்தில் நீட்டப்படுகின்றன.',
    craftDetails: '24-யார்டு பீம் மீது நீட்டப்பட்ட 4,800 பாவு முனைகள்; இரட்டை கொர்வை இடைபூட்டுக்கு தனி பார்டர் பாவு நூல்கள் பதற்றப்படுத்தப்பட்டுள்ளன.',
    colorTheme: '#38BDF8',
    accentColor: '#00C9A7'
  },
  {
    id: 3,
    key: 'weaving',
    name: '4. நெசவு',
    tamilName: 'கைத்தறி & கொர்வை',
    tagline: 'தறி & கொர்வை இடைபூட்டு',
    description: 'பறக்கும் நாடாக்கள் shed-ஐக் கடக்கும்போது heddles உயர்ந்து, தூல் மற்றும் ஜரிகை நூல்களை சிக்கலான கோவில் பார்டர் மற்றும் பல்லு வடிவமாக பின்னுகின்றன.',
    craftDetails: 'பாரம்பரிய குழி கைத்தறி, இரண்டு நெசவாளர்கள் பக்கவாட்டு நாடாக்களை கையாண்டு பார்டர்களை புடவை உடலுடன் தடையின்றி பூட்டுகின்றனர்.',
    colorTheme: '#D4AF37',
    accentColor: '#C6A15B'
  },
  {
    id: 4,
    key: 'finishing-qc',
    name: '5. ஃபினிஷிங் & தர சோதனை',
    tamilName: 'ஆய்வு & பிரஸ்',
    tagline: 'சில்க் மார்க் தர ஆய்வு',
    description: 'நெய்யப்பட்ட புடவை ஆய்வுப் பாலத்தில் விரிக்கப்பட்டு, நூல் அடர்த்தி ஸ்கேன் செய்யப்பட்டு, மென்மையாக்கப்பட்டு, சில்க் மார்க் சான்றிதழ் முத்திரையுடன் அங்கீகரிக்கப்படுகிறது.',
    craftDetails: '100% கைமுறை மேற்பரப்பு குறைபாட்டு ஆய்வு, நூல் ஒழுங்கமைத்தல், மென்மையான ஸ்டீம் ஃபினிஷிங் மற்றும் சில்க் மார்க் அங்கீகாரம்.',
    colorTheme: '#10B981',
    accentColor: '#34D399'
  },
  {
    id: 5,
    key: 'packing',
    name: '6. பொதி செய்தல்',
    tamilName: 'பொட்டிக் பேக்கிங்',
    tagline: 'சொகுசு ஜவுளி பேக்கிங்',
    description: 'தூய்மையான புடவை நேர்த்தியான மடிப்புகளில் மடிக்கப்பட்டு, அமிலமற்ற பட்டர் பேப்பரால் பாதுகாக்கப்பட்டு, தங்க முத்திரையிடப்பட்ட பரிசு பெட்டியில் வைக்கப்படுகிறது.',
    craftDetails: 'தங்க ஜரிகை மங்காமல் பாதுகாக்க எதிர்ப்புப் பேக்கிங், பார்கோடு குறிப்பது மற்றும் கடையின் ரிப்பன் முத்திரை.',
    colorTheme: '#64152F',
    accentColor: '#D4AF37'
  }
];

interface SareeProductionCycleAnimationProps {
  className?: string;
  isCompact?: boolean;
}

export const SareeProductionCycleAnimation: React.FC<SareeProductionCycleAnimationProps> = ({
  className = '',
  isCompact = false
}) => {
  const { language } = useLanguage();
  const SAREE_STAGES = language === 'ta' ? SAREE_STAGES_TA : SAREE_STAGES_EN;

  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [stageProgress, setStageProgress] = useState<number>(0);
  const animTimerRef = useRef<any>(null);
  const progressTimerRef = useRef<any>(null);

  const STAGE_DURATION_MS = 4000;
  const PROGRESS_INTERVAL_MS = 40;

  // Reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // Main stage progression timer
  useEffect(() => {
    if (!isPlaying) {
      clearInterval(progressTimerRef.current);
      return;
    }

    const stepIncrement = (PROGRESS_INTERVAL_MS / STAGE_DURATION_MS) * 100;
    progressTimerRef.current = setInterval(() => {
      setStageProgress((prev) => {
        if (prev >= 100) {
          setCurrentStageIndex((curr) => (curr + 1) % SAREE_STAGES.length);
          return 0;
        }
        return prev + stepIncrement;
      });
    }, PROGRESS_INTERVAL_MS);

    return () => clearInterval(progressTimerRef.current);
  }, [isPlaying]);

  const activeStage = SAREE_STAGES[currentStageIndex];

  const handleSelectStage = (index: number) => {
    setCurrentStageIndex(index);
    setStageProgress(0);
  };

  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    setCurrentStageIndex(0);
    setStageProgress(0);
    setIsPlaying(true);
  };

  return (
    <div
      className={`rounded-3xl bg-gradient-to-br from-[#0D1224] via-[#0A0D16] to-[#160B1F] border border-[#D4AF37]/40 shadow-2xl overflow-hidden p-5 sm:p-7 text-[#F7F3EA] relative flex flex-col justify-between ${className}`}
      style={{
        boxShadow: '0 20px 50px rgba(10, 13, 22, 0.7), inset 0 0 40px rgba(212, 175, 55, 0.05)'
      }}
    >
      {/* Background Jacquard Loom Grid & Ambient Warp Glow */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12px 12px, #D4AF37 1px, transparent 0), linear-gradient(to right, rgba(212, 175, 55, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px, 48px 48px, 48px 48px'
        }}
      />

      {/* Decorative Gold Border Line Accent at Top */}
      <div
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
        style={{ boxShadow: '0 0 10px #D4AF37' }}
      />

      {/* Header & Tagline */}
      <div className="relative z-10 flex items-center justify-between gap-3 pb-3 border-b border-[#D4AF37]/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif font-black text-lg sm:text-xl tracking-wider text-[#F7F3EA]">
              TRIZEN
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
              Saree Production Cycle
            </span>
          </div>
          <p className="text-xs text-[#C6A15B] font-serif italic mt-0.5 tracking-wide">
            &ldquo;From Thread to Tradition&rdquo; &bull; The Complete Saree Journey
          </p>
        </div>

        {/* Animation Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={togglePlayPause}
            className="p-1.5 rounded-lg bg-[#0A0D16] border border-[#D4AF37]/40 hover:border-[#D4AF37] text-gray-300 hover:text-white transition-all text-xs"
            title={isPlaying ? 'Pause Animation' : 'Play Animation'}
            aria-label={isPlaying ? 'Pause Animation' : 'Play Animation'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-[#D4AF37]" />}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-[#0A0D16] border border-[#D4AF37]/40 hover:border-[#D4AF37] text-gray-300 hover:text-white transition-all text-xs"
            title="Restart Journey Cycle"
            aria-label="Restart Journey Cycle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stage Flow Nodes & Flowing Thread Connection */}
      <div className="relative z-10 my-4">
        {/* Continuous Connecting Gold Thread Line */}
        <div className="relative flex items-center justify-between">
          <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-0.5 bg-gray-800 pointer-events-none" />
          
          {/* Animated Traveling Thread Indicator */}
          <div
            className="absolute top-1/2 left-4 -translate-y-1/2 h-0.5 pointer-events-none transition-all duration-300 ease-out"
            style={{
              width: `${(currentStageIndex / (SAREE_STAGES.length - 1)) * 92 + (stageProgress / 100) * (92 / (SAREE_STAGES.length - 1))}%`,
              background: 'linear-gradient(90deg, #D4AF37, #C6A15B, #EF4444, #38BDF8, #10B981, #64152F)',
              boxShadow: '0 0 8px #D4AF37, 0 0 14px rgba(212, 175, 55, 0.5)'
            }}
          />

          {/* 6 Stage Buttons / Checkpoints */}
          {SAREE_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => handleSelectStage(idx)}
                className="relative z-10 group focus:outline-none flex flex-col items-center"
                title={`${stage.name} - ${stage.tagline}`}
              >
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                    isCurrent
                      ? 'bg-gradient-to-br from-[#D4AF37] to-[#C6A15B] text-[#0A0D16] scale-110 shadow-lg shadow-[#D4AF37]/50 ring-4 ring-[#D4AF37]/30 active-stage-glow'
                      : isCompleted
                      ? 'bg-[#10B981] text-white shadow-sm ring-2 ring-emerald-500/30'
                      : 'bg-[#0A0D16] text-gray-400 border border-gray-700 group-hover:border-[#D4AF37]/60'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <span
                  className={`text-[10px] mt-1 font-medium transition-colors hidden sm:block ${
                    isCurrent ? 'text-[#D4AF37] font-bold' : isCompleted ? 'text-gray-300' : 'text-gray-500'
                  }`}
                >
                  {stage.name.split('. ')[1]?.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Dynamic Stage Animation Stage Canvas */}
      <div
        className="relative z-10 rounded-2xl bg-[#0A0D16]/90 border border-[#D4AF37]/30 p-3 sm:p-5 flex-1 flex flex-col justify-between overflow-hidden shadow-inner my-1 sm:my-2 min-h-[175px] sm:min-h-[245px]"
      >
        {/* Dynamic Animated Stage Illustration */}
        <div className="flex-1 flex items-center justify-center py-2">
          {/* STAGE 1: RAW MATERIALS */}
          {activeStage.key === 'raw-materials' && (
            <div className="flex items-center justify-center gap-6 animate-fadeIn">
              <svg width="220" height="130" viewBox="0 0 220 130" fill="none" className="max-w-full">
                {/* Background Spool 1: Mulberry Silk Yarn Cone */}
                <g className="animate-pulse" style={{ animationDuration: '3s' }}>
                  <path d="M 40 105 L 55 35 Q 60 25 65 35 L 80 105 Z" fill="#E6D5AD" stroke="#D4AF37" strokeWidth="1.5" />
                  {/* Silk thread grooves */}
                  {[45, 55, 65, 75, 85, 95].map((y, i) => (
                    <line key={i} x1="48" y1={y} x2="72" y2={y} stroke="#C6A15B" strokeWidth="1.2" opacity="0.8" />
                  ))}
                  {/* Spool core base */}
                  <ellipse cx="60" cy="108" rx="22" ry="7" fill="#64152F" stroke="#D4AF37" strokeWidth="1" />
                  <ellipse cx="60" cy="28" rx="7" ry="3" fill="#D4AF37" />
                </g>

                {/* Spool 2: Gold Zari Bullion Spool */}
                <g>
                  <ellipse cx="140" cy="108" rx="24" ry="8" fill="#0A0D16" stroke="#D4AF37" strokeWidth="1.5" />
                  <rect x="122" y="45" width="36" height="60" rx="3" fill="url(#goldZariGrad)" stroke="#D4AF37" strokeWidth="1.5" />
                  {/* Zari metallic wrap lines */}
                  {[52, 60, 68, 76, 84, 92, 100].map((y, i) => (
                    <line key={i} x1="123" y1={y} x2="157" y2={y} stroke="#FFF7D6" strokeWidth="1" opacity="0.9" />
                  ))}
                  <ellipse cx="140" cy="45" rx="18" ry="5" fill="#D4AF37" />
                  <circle cx="140" cy="45" r="4" fill="#0D1224" />
                </g>

                {/* Flowing golden raw thread unwinding into next stage */}
                <path
                  d="M 60 28 C 80 10, 110 20, 140 45 C 170 70, 190 40, 215 50"
                  stroke="#D4AF37"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  fill="none"
                  className={prefersReducedMotion ? '' : 'thread-dash-animated'}
                />

                {/* Floating luster particles */}
                <circle cx="95" cy="22" r="2" fill="#FFF7D6" className="animate-ping" style={{ animationDuration: '2s' }} />
                <circle cx="175" cy="35" r="1.5" fill="#D4AF37" className="animate-ping" style={{ animationDuration: '2.5s' }} />

                <defs>
                  <linearGradient id="goldZariGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#C6A15B" />
                    <stop offset="50%" stopColor="#FFEAA7" />
                    <stop offset="100%" stopColor="#9E782F" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}

          {/* STAGE 2: DYEING */}
          {activeStage.key === 'dyeing' && (
            <div className="flex items-center justify-center animate-fadeIn">
              <svg width="220" height="130" viewBox="0 0 220 130" fill="none" className="max-w-full">
                {/* Steam Vapor Wisps */}
                <path d="M 95 35 Q 90 20 98 10" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.5" fill="none" className="animate-pulse" />
                <path d="M 125 35 Q 130 20 122 10" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.5" fill="none" className="animate-pulse" style={{ animationDelay: '0.4s' }} />

                {/* Dyeing Cauldron / Vat */}
                <ellipse cx="110" cy="55" rx="55" ry="14" fill="#64152F" stroke="#D4AF37" strokeWidth="2" />
                <path d="M 55 55 Q 55 110 110 115 Q 165 110 165 55 Z" fill="url(#vatGrad)" stroke="#D4AF37" strokeWidth="2" />
                
                {/* Swirling Dye Liquid */}
                <ellipse cx="110" cy="58" rx="48" ry="10" fill="#EF4444" opacity="0.85" />
                <path d="M 70 58 Q 110 65 150 58" stroke="#FDE047" strokeWidth="1.5" fill="none" opacity="0.6" />

                {/* Submerged Yarn Hanks entering raw ivory -> exiting rich dyed crimson */}
                <g className={prefersReducedMotion ? '' : 'shuttle-slide'}>
                  {/* Incoming Raw Thread (Ivory) */}
                  <path d="M 25 25 Q 60 20 85 45" stroke="#E6D5AD" strokeWidth="2.5" fill="none" />
                  {/* Dip into Vat */}
                  <path d="M 85 45 C 95 70, 105 75, 110 75 C 115 75, 125 70, 135 45" stroke="#EF4444" strokeWidth="3" fill="none" />
                  {/* Exiting Radiant Dyed Thread (Crimson) */}
                  <path d="M 135 45 Q 160 20 200 30" stroke="#DC2626" strokeWidth="2.5" fill="none" />
                </g>

                {/* Droplets of vibrant color */}
                <circle cx="110" cy="85" r="2.5" fill="#EF4444" className="animate-bounce" />
                <circle cx="130" cy="78" r="2" fill="#F59E0B" className="animate-bounce" style={{ animationDelay: '0.2s' }} />

                <defs>
                  <linearGradient id="vatGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0D1224" />
                    <stop offset="60%" stopColor="#64152F" />
                    <stop offset="100%" stopColor="#0A0D16" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}

          {/* STAGE 3: WARPING (VAARPU) */}
          {activeStage.key === 'warping' && (
            <div className="flex items-center justify-center animate-fadeIn">
              <svg width="220" height="130" viewBox="0 0 220 130" fill="none" className="max-w-full">
                {/* Warping Drum Frame (Vaarpu Cylinder) */}
                <g className={prefersReducedMotion ? '' : 'spindle-spin'} style={{ transformOrigin: '70px 65px' }}>
                  <circle cx="70" cy="65" r="38" stroke="#D4AF37" strokeWidth="1.5" strokeDasharray="6 4" fill="none" />
                  <circle cx="70" cy="65" r="16" fill="#0D1224" stroke="#D4AF37" strokeWidth="2" />
                  <line x1="70" y1="27" x2="70" y2="103" stroke="#D4AF37" strokeWidth="1" opacity="0.6" />
                  <line x1="32" y1="65" x2="108" y2="65" stroke="#D4AF37" strokeWidth="1" opacity="0.6" />
                  <line x1="43" y1="38" x2="97" y2="92" stroke="#D4AF37" strokeWidth="1" opacity="0.6" />
                  <line x1="97" y1="38" x2="43" y2="92" stroke="#D4AF37" strokeWidth="1" opacity="0.6" />
                </g>

                {/* Comb / Reed Separator Guide */}
                <rect x="130" y="30" width="8" height="70" rx="2" fill="#64152F" stroke="#D4AF37" strokeWidth="1" />
                {[38, 48, 58, 68, 78, 88].map((y, i) => (
                  <line key={i} x1="130" y1={y} x2="138" y2={y} stroke="#D4AF37" strokeWidth="1" />
                ))}

                {/* Parallel High-Tension Warp Threads stretching to beam */}
                {[36, 44, 52, 60, 68, 76, 84, 92].map((y, i) => (
                  <path
                    key={i}
                    d={`M 95 ${50 + (i - 3.5) * 6} L 130 ${y} L 205 ${y}`}
                    stroke={i % 3 === 0 ? '#D4AF37' : i % 2 === 0 ? '#38BDF8' : '#EF4444'}
                    strokeWidth="1.4"
                    fill="none"
                    opacity="0.85"
                  />
                ))}

                {/* Traveling tension shuttle guide */}
                <circle cx="165" cy="60" r="3" fill="#D4AF37" className="animate-ping" style={{ animationDuration: '2s' }} />
              </svg>
            </div>
          )}

          {/* STAGE 4: WEAVING */}
          {activeStage.key === 'weaving' && (
            <div className="flex items-center justify-center animate-fadeIn">
              <svg width="220" height="130" viewBox="0 0 220 130" fill="none" className="max-w-full">
                {/* Loom Reed & Heddles Frame */}
                <rect x="35" y="20" width="150" height="8" rx="2" fill="#64152F" stroke="#D4AF37" strokeWidth="1" />
                <rect x="35" y="102" width="150" height="8" rx="2" fill="#64152F" stroke="#D4AF37" strokeWidth="1" />

                {/* Warp Threads passing vertically */}
                {[50, 65, 80, 95, 110, 125, 140, 155, 170].map((x, i) => (
                  <line key={i} x1={x} y1="28" x2={x} y2="60" stroke="#C6A15B" strokeWidth="1" opacity="0.6" />
                ))}

                {/* Animated Flying Shuttle with Gold Weft Thread */}
                <g className={prefersReducedMotion ? '' : 'shuttle-slide'}>
                  <path
                    d="M 85 58 C 90 53, 130 53, 135 58 C 130 63, 90 63, 85 58 Z"
                    fill="#D4AF37"
                    stroke="#0A0D16"
                    strokeWidth="1"
                  />
                  <circle cx="110" cy="58" r="2.5" fill="#64152F" />
                  <path d="M 75 58 Q 50 50 35 58" stroke="#D4AF37" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
                </g>

                {/* Formed Woven Saree Fabric with Temple Border Pattern */}
                <rect x="45" y="66" width="130" height="36" fill="url(#wovenFabricGrad)" stroke="#D4AF37" strokeWidth="1.2" />

                {/* Zari Temple Motifs on Saree Border */}
                <path
                  d="M 50 85 L 56 75 L 62 85 L 68 75 L 74 85 L 80 75 L 86 85 L 92 75 L 98 85 L 104 75 L 110 85 L 116 75 L 122 85 L 128 75 L 134 85 L 140 75 L 146 85 L 152 75 L 158 85 L 164 75 L 170 85"
                  stroke="#FFEAA7"
                  strokeWidth="1.5"
                  fill="none"
                />

                <defs>
                  <linearGradient id="wovenFabricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#64152F" />
                    <stop offset="70%" stopColor="#80193C" />
                    <stop offset="100%" stopColor="#4A0E23" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}

          {/* STAGE 5: FINISHING & QUALITY CHECK */}
          {activeStage.key === 'finishing-qc' && (
            <div className="flex items-center justify-center animate-fadeIn">
              <svg width="220" height="130" viewBox="0 0 220 130" fill="none" className="max-w-full">
                {/* Smooth Woven Saree Unfurled on Inspection Bridge */}
                <path
                  d="M 30 75 Q 70 65 110 75 Q 150 85 190 75 L 190 95 Q 150 105 110 95 Q 70 85 30 95 Z"
                  fill="#64152F"
                  stroke="#D4AF37"
                  strokeWidth="1.5"
                />
                
                {/* Gold Zari Pallu Peacock Motifs */}
                <line x1="32" y1="85" x2="188" y2="85" stroke="#D4AF37" strokeWidth="1.5" strokeDasharray="5 3" />

                {/* Handloom Roller Finishing Iron / Calender Bar */}
                <rect x="50" y="45" width="45" height="14" rx="4" fill="#0D1224" stroke="#38BDF8" strokeWidth="1.5" />
                <path d="M 65 38 L 80 38" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />

                {/* Animated Magnifying Inspection Glass with QC crosshair */}
                <g className={prefersReducedMotion ? '' : 'shuttle-slide'}>
                  <circle cx="130" cy="55" r="16" fill="rgba(56, 189, 248, 0.15)" stroke="#38BDF8" strokeWidth="2" />
                  <line x1="142" y1="67" x2="155" y2="80" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="130" cy="55" r="3" fill="#10B981" />
                </g>

                {/* Silk Mark Authentication Seal Badge */}
                <g transform="translate(160, 20)">
                  <polygon points="18,0 23,12 36,12 26,20 30,32 18,25 6,32 10,20 0,12 13,12" fill="#D4AF37" stroke="#FFF7D6" strokeWidth="1" />
                  <circle cx="18" cy="18" r="6" fill="#0D1224" />
                </g>
              </svg>
            </div>
          )}

          {/* STAGE 6: PACKING */}
          {activeStage.key === 'packing' && (
            <div className="flex items-center justify-center animate-fadeIn">
              <svg width="220" height="130" viewBox="0 0 220 130" fill="none" className="max-w-full">
                {/* Luxury Textile Box Base */}
                <rect x="45" y="45" width="130" height="65" rx="6" fill="#0D1224" stroke="#D4AF37" strokeWidth="2" />

                {/* Folded Silk Saree Layers inside the box */}
                <path
                  d="M 55 70 C 65 65, 115 65, 125 70 C 135 75, 155 75, 165 70 L 165 88 C 155 92, 135 92, 125 88 C 115 84, 65 84, 55 88 Z"
                  fill="#64152F"
                  stroke="#C6A15B"
                  strokeWidth="1.2"
                />

                {/* Fine Tissue Paper / Gold Wrap Pleats */}
                <path d="M 58 75 L 162 75" stroke="#FFEAA7" strokeWidth="1.2" strokeDasharray="4 2" />

                {/* Luxury Satin Ribbon (Gold Cross) */}
                <rect x="105" y="45" width="10" height="65" fill="#D4AF37" opacity="0.85" />
                <rect x="45" y="72" width="130" height="8" fill="#D4AF37" opacity="0.85" />

                {/* Ribbon Rosette Bow */}
                <ellipse cx="110" cy="76" rx="9" ry="5" fill="#FFF7D6" stroke="#D4AF37" strokeWidth="1" />
                <ellipse cx="110" cy="76" rx="3" ry="3" fill="#64152F" />

                {/* TRIZEN Royal Seal on Package */}
                <g transform="translate(135, 88)">
                  <rect x="0" y="0" width="28" height="16" rx="3" fill="#D4AF37" />
                  <text x="14" y="11" fill="#0A0D16" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="serif">TRIZEN</text>
                </g>
              </svg>
            </div>
          )}
        </div>

        {/* Dynamic Stage Details & Narrative Text */}
        <div className="pt-3 border-t border-[#D4AF37]/20 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full animate-ping"
                style={{ backgroundColor: activeStage.accentColor }}
              />
              <h4 className="font-serif font-bold text-sm sm:text-base text-white tracking-wide">
                {activeStage.name}
              </h4>
              <span className="text-[11px] text-[#C6A15B] font-mono">({activeStage.tamilName})</span>
            </div>
            
            <span
              className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${activeStage.accentColor}25`,
                color: activeStage.accentColor,
                border: `1px solid ${activeStage.accentColor}50`
              }}
            >
              {activeStage.tagline}
            </span>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed font-sans line-clamp-2">
            {activeStage.description}
          </p>

          <div className="mt-2 text-[10px] text-[#C6A15B]/80 font-mono flex items-center justify-between gap-2">
            <span className="line-clamp-1">&bull; {activeStage.craftDetails}</span>
            <span className="text-gray-400 shrink-0">
              {language === 'ta' ? `படி ${currentStageIndex + 1} / 6` : `Step ${currentStageIndex + 1} of 6`}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar for Current Stage */}
      <div className="relative z-10 pt-2">
        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1 font-mono">
          <span>{language === 'ta' ? 'உற்பத்திச் சுழற்சி முன்னேற்றம்' : 'Production Cycle Progress'}</span>
          <span>{Math.round(stageProgress)}%</span>
        </div>
        <div className="w-full bg-[#0A0D16] h-1.5 rounded-full overflow-hidden border border-[#D4AF37]/30">
          <div
            className="h-full transition-all duration-75 ease-linear rounded-full"
            style={{
              width: `${stageProgress}%`,
              backgroundColor: activeStage.accentColor,
              boxShadow: `0 0 8px ${activeStage.accentColor}`
            }}
          />
        </div>
      </div>
    </div>
  );
};

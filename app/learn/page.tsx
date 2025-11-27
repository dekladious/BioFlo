"use client";

import { useState, useMemo } from "react";
import { BookOpen, Clock, Check, Bookmark, ChevronRight, X, Lightbulb, Search, Filter, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Lesson, LessonCategory, LessonProgress } from "@/lib/types/lessons";
import { LESSONS, CATEGORY_CONFIG, getRelatedLessons } from "@/lib/types/lessons";

const CARD = "rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)] backdrop-blur-md";

// In-memory progress tracking
let progressCache: Map<string, LessonProgress> = new Map();

function LessonCard({ lesson, progress, onClick }: { lesson: Lesson; progress?: LessonProgress; onClick: () => void }) {
  const cat = CATEGORY_CONFIG[lesson.category];
  const isCompleted = !!progress?.completedAt;
  const isBookmarked = progress?.bookmarked;

  return (
    <button onClick={onClick} className={cn("w-full text-left rounded-2xl border p-5 transition hover:border-white/20", isCompleted ? "border-green-500/30 bg-green-500/5" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]")}>
      <div className="flex items-start gap-4">
        <div className="size-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: `${cat.color}20` }}>
          {cat.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
              {cat.label}
            </span>
            <span className="text-xs text-white/40">{lesson.readTimeMinutes} min read</span>
            {isCompleted && <Check className="size-4 text-green-400" />}
            {isBookmarked && <Bookmark className="size-4 text-yellow-400 fill-current" />}
          </div>
          <h3 className="font-semibold text-white line-clamp-1">{lesson.title}</h3>
          <p className="text-sm text-white/60 mt-1 line-clamp-2">{lesson.summary}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {lesson.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <ChevronRight className="size-5 text-white/30 shrink-0 mt-1" />
      </div>
    </button>
  );
}

function LessonModal({ lesson, progress, onClose, onComplete, onBookmark }: { lesson: Lesson | null; progress?: LessonProgress; onClose: () => void; onComplete: () => void; onBookmark: () => void }) {
  if (!lesson) return null;

  const cat = CATEGORY_CONFIG[lesson.category];
  const isCompleted = !!progress?.completedAt;
  const isBookmarked = progress?.bookmarked;
  const relatedLessons = getRelatedLessons(lesson.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0a0a12] shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
            <X className="size-5" />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
              {cat.icon} {cat.label}
            </span>
            <span className="text-xs text-white/40">{lesson.readTimeMinutes} min read</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40 capitalize">{lesson.difficulty}</span>
          </div>
          
          <h2 className="text-2xl font-bold text-white pr-8">{lesson.title}</h2>
          <p className="text-white/60 mt-2">{lesson.summary}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-invert max-w-none">
            {lesson.content.split('\n\n').map((paragraph, idx) => {
              if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                return <h3 key={idx} className="text-lg font-semibold text-white mt-4 mb-2">{paragraph.replace(/\*\*/g, '')}</h3>;
              }
              if (paragraph.includes('**')) {
                const parts = paragraph.split(/(\*\*[^*]+\*\*)/);
                return (
                  <p key={idx} className="text-white/80 leading-relaxed mb-3">
                    {parts.map((part, i) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="text-white font-semibold">{part.replace(/\*\*/g, '')}</strong>;
                      }
                      return part;
                    })}
                  </p>
                );
              }
              if (paragraph.startsWith('- ')) {
                const items = paragraph.split('\n').filter(l => l.startsWith('- '));
                return (
                  <ul key={idx} className="space-y-1 mb-3">
                    {items.map((item, i) => (
                      <li key={i} className="text-white/80 flex items-start gap-2">
                        <span className="text-accent-primary mt-1.5">•</span>
                        {item.replace('- ', '')}
                      </li>
                    ))}
                  </ul>
                );
              }
              return <p key={idx} className="text-white/80 leading-relaxed mb-3">{paragraph}</p>;
            })}
          </div>

          {/* Key Takeaways */}
          <div className="mt-6 rounded-xl border border-accent-primary/30 bg-accent-primary/10 p-4">
            <h4 className="text-sm font-semibold text-accent-primary flex items-center gap-2 mb-3">
              <Lightbulb className="size-4" /> Key Takeaways
            </h4>
            <ul className="space-y-2">
              {lesson.keyTakeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-white/80">
                  <Check className="size-4 text-accent-primary shrink-0 mt-0.5" />
                  {takeaway}
                </li>
              ))}
            </ul>
          </div>

          {/* Action Items */}
          {lesson.actionItems && lesson.actionItems.length > 0 && (
            <div className="mt-4 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
              <h4 className="text-sm font-semibold text-orange-400 flex items-center gap-2 mb-3">
                <ArrowRight className="size-4" /> Try This Today
              </h4>
              <ul className="space-y-2">
                {lesson.actionItems.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-white/80">
                    <span className="text-orange-400">→</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Lessons */}
          {relatedLessons.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-white/70 mb-3">Related Lessons</h4>
              <div className="space-y-2">
                {relatedLessons.map(related => (
                  <div key={related.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                    <span className="text-lg">{CATEGORY_CONFIG[related.category].icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{related.title}</p>
                      <p className="text-xs text-white/50">{related.readTimeMinutes} min</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <button onClick={onBookmark} className={cn("flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition", isBookmarked ? "border-yellow-500/50 bg-yellow-500/20 text-yellow-400" : "border-white/10 text-white/60 hover:bg-white/5")}>
            <Bookmark className={cn("size-4", isBookmarked && "fill-current")} />
            {isBookmarked ? 'Saved' : 'Save'}
          </button>
          <button onClick={onComplete} className={cn("flex items-center gap-2 rounded-xl px-6 py-2 text-sm font-semibold transition", isCompleted ? "bg-green-500/20 text-green-400" : "bg-accent-primary/20 text-white hover:bg-accent-primary/30")}>
            <Check className="size-4" />
            {isCompleted ? 'Completed' : 'Mark Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LearnPage() {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<Map<string, LessonProgress>>(progressCache);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LessonCategory | 'all'>('all');

  const filteredLessons = useMemo(() => {
    return LESSONS.filter(lesson => {
      const matchesSearch = !searchTerm || 
        lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || lesson.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const completedCount = Array.from(progress.values()).filter(p => p.completedAt).length;
  const bookmarkedCount = Array.from(progress.values()).filter(p => p.bookmarked).length;
  const totalMinutes = Array.from(progress.entries())
    .filter(([_, p]) => p.completedAt)
    .reduce((sum, [id]) => {
      const lesson = LESSONS.find(l => l.id === id);
      return sum + (lesson?.readTimeMinutes || 0);
    }, 0);

  const handleComplete = (lessonId: string) => {
    const existing = progress.get(lessonId) || { lessonId, bookmarked: false };
    const updated = { ...existing, completedAt: existing.completedAt ? undefined : new Date().toISOString() };
    const newProgress = new Map(progress);
    newProgress.set(lessonId, updated);
    setProgress(newProgress);
    progressCache = newProgress;
  };

  const handleBookmark = (lessonId: string) => {
    const existing = progress.get(lessonId) || { lessonId, bookmarked: false };
    const updated = { ...existing, bookmarked: !existing.bookmarked };
    const newProgress = new Map(progress);
    newProgress.set(lessonId, updated);
    setProgress(newProgress);
    progressCache = newProgress;
  };

  return (
    <div className="w-full space-y-6 px-4 pb-12 pt-6 lg:px-8 xl:px-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Learn</h1>
          <p className="text-sm text-white/60">Micro-lessons for health optimization</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className={cn(CARD, "flex items-center gap-4")}>
          <div className="size-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
            <Check className="size-6 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{completedCount}</p>
            <p className="text-xs text-white/50">Completed</p>
          </div>
        </div>
        <div className={cn(CARD, "flex items-center gap-4")}>
          <div className="size-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
            <Bookmark className="size-6 text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{bookmarkedCount}</p>
            <p className="text-xs text-white/50">Saved</p>
          </div>
        </div>
        <div className={cn(CARD, "flex items-center gap-4")}>
          <div className="size-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <Clock className="size-6 text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{totalMinutes}</p>
            <p className="text-xs text-white/50">Minutes learned</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
          <input type="text" placeholder="Search lessons..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder:text-white/40 focus:border-accent-primary focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSelectedCategory('all')} className={cn("rounded-lg px-3 py-2 text-xs transition", selectedCategory === 'all' ? "bg-accent-primary/20 text-white" : "bg-white/5 text-white/60 hover:bg-white/10")}>All</button>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <button key={key} onClick={() => setSelectedCategory(key as LessonCategory)} className={cn("rounded-lg px-3 py-2 text-xs transition flex items-center gap-1", selectedCategory === key ? "text-white" : "text-white/60 hover:bg-white/10")} style={selectedCategory === key ? { backgroundColor: `${config.color}30` } : {}}>
              {config.icon} {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lessons List */}
      {filteredLessons.length === 0 ? (
        <div className={cn(CARD, "text-center py-12")}>
          <BookOpen className="mx-auto size-12 text-white/30 mb-4" />
          <p className="text-white/70 font-medium">No lessons found</p>
          <p className="text-sm text-white/50 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLessons.map(lesson => (
            <LessonCard key={lesson.id} lesson={lesson} progress={progress.get(lesson.id)} onClick={() => setSelectedLesson(lesson)} />
          ))}
        </div>
      )}

      {/* Lesson Modal */}
      <LessonModal lesson={selectedLesson} progress={selectedLesson ? progress.get(selectedLesson.id) : undefined} onClose={() => setSelectedLesson(null)} onComplete={() => selectedLesson && handleComplete(selectedLesson.id)} onBookmark={() => selectedLesson && handleBookmark(selectedLesson.id)} />
    </div>
  );
}


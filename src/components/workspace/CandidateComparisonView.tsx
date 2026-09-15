import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  ArrowUpDown,
  Search,
  Filter,
  Check,
  X,
  AlertTriangle,
  FileText,
  Briefcase,
  GraduationCap,
  Award,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Code,
  Layers,
  Scale,
  Download,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import {
  JobScreeningSession,
  FinalCandidateAnalysis,
  RecommendationTier,
  ParsedRequirement,
  AtsMatchedItem,
  AgenticRequirementMatch,
} from '../../types';

interface CandidateComparisonViewProps {
  session: JobScreeningSession;
  candidateAId?: string;
  candidateBId?: string;
  onSelectCandidateForDetail: (candidate: FinalCandidateAnalysis) => void;
  onClose?: () => void;
}

type RequirementFilterMode = 'ALL' | 'DIFFERENCES' | 'MANDATORY' | 'BOTH_MATCHED' | 'EITHER_GAP';

export const CandidateComparisonView: React.FC<CandidateComparisonViewProps> = ({
  session,
  candidateAId: initialAId,
  candidateBId: initialBId,
  onSelectCandidateForDetail,
  onClose,
}) => {
  // Sort candidates by rank/score for convenient selection
  const sortedCandidates = useMemo(() => {
    return [...session.candidates].sort((a, b) => {
      const rankA = a.rank ?? 999;
      const rankB = b.rank ?? 999;
      if (rankA !== rankB) return rankA - rankB;
      return b.comprehensiveScore - a.comprehensiveScore;
    });
  }, [session.candidates]);

  // Candidates selection state
  const [selectedAId, setSelectedAId] = useState<string>(() => {
    if (initialAId && session.candidates.some((c) => c.candidateId === initialAId)) {
      return initialAId;
    }
    return sortedCandidates[0]?.candidateId || '';
  });

  const [selectedBId, setSelectedBId] = useState<string>(() => {
    if (initialBId && session.candidates.some((c) => c.candidateId === initialBId) && initialBId !== initialAId) {
      return initialBId;
    }
    return sortedCandidates[1]?.candidateId || sortedCandidates[0]?.candidateId || '';
  });

  // Filter controls
  const [reqFilterMode, setReqFilterMode] = useState<RequirementFilterMode>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedReqIds, setExpandedReqIds] = useState<Set<string>>(new Set());

  // Resolved candidate objects
  const candidateA = useMemo(() => {
    return session.candidates.find((c) => c.candidateId === selectedAId) || sortedCandidates[0] || null;
  }, [session.candidates, selectedAId, sortedCandidates]);

  const candidateB = useMemo(() => {
    return session.candidates.find((c) => c.candidateId === selectedBId) || sortedCandidates[1] || sortedCandidates[0] || null;
  }, [session.candidates, selectedBId, sortedCandidates]);

  // Swap candidates
  const handleSwapCandidates = () => {
    if (!candidateA || !candidateB) return;
    const tempA = selectedAId;
    setSelectedAId(selectedBId);
    setSelectedBId(tempA);
  };

  // Helper to extract match status and evidence for a candidate against a parsed JD requirement
  const getCandidateRequirementDetail = (
    candidate: FinalCandidateAnalysis | null,
    req: ParsedRequirement
  ): {
    status: 'MATCHED' | 'PARTIAL' | 'MISSING';
    matchType: string;
    evidenceQuote: string;
    evidenceRef: string;
    matchedKeywords: string[];
    reason?: string;
  } => {
    if (!candidate) {
      return {
        status: 'MISSING',
        matchType: 'NONE',
        evidenceQuote: 'No evaluation data found.',
        evidenceRef: 'Unverified',
        matchedKeywords: [],
      };
    }

    const reqTextNorm = req.text.toLowerCase().trim();
    const reqKeywords = (req.keywords || []).map((k) => k.toLowerCase().trim());

    // 1. Check ATS Matched Requirements
    const atsMatched = candidate.ats?.matchedRequirements?.find(
      (m) =>
        m.requirementId === req.id ||
        m.requirement.toLowerCase().includes(reqTextNorm) ||
        reqTextNorm.includes(m.requirement.toLowerCase()) ||
        m.matchedKeywords?.some((k) => reqKeywords.includes(k.toLowerCase()))
    );

    if (atsMatched) {
      return {
        status: 'MATCHED',
        matchType: atsMatched.matchType || 'EXACT',
        evidenceQuote: atsMatched.evidenceQuote || 'Direct keyword and context verification found in resume.',
        evidenceRef: atsMatched.evidenceRef || 'ATS Engine',
        matchedKeywords: atsMatched.matchedKeywords || [],
      };
    }

    // 2. Check Agentic Matched Requirements
    const agenticMatched = candidate.agentic?.matchedRequirements?.find(
      (m) =>
        m.requirement.toLowerCase().includes(reqTextNorm) ||
        reqTextNorm.includes(m.requirement.toLowerCase())
    );

    if (agenticMatched && agenticMatched.status === 'MATCHED') {
      return {
        status: 'MATCHED',
        matchType: 'SEMANTIC',
        evidenceQuote: agenticMatched.evidenceQuote || agenticMatched.reason || 'Semantic match verified by AI.',
        evidenceRef: agenticMatched.evidenceRef || 'AI Agentic Evaluation',
        matchedKeywords: [],
        reason: agenticMatched.reason,
      };
    }

    // 3. Check ATS Partial Matches
    const atsPartial = candidate.ats?.partialMatches?.find(
      (p) =>
        p.requirementId === req.id ||
        p.requirement.toLowerCase().includes(reqTextNorm) ||
        reqTextNorm.includes(p.requirement.toLowerCase()) ||
        p.matchedKeywords?.some((k) => reqKeywords.includes(k.toLowerCase()))
    );

    if (atsPartial) {
      return {
        status: 'PARTIAL',
        matchType: atsPartial.matchType || 'PARTIAL',
        evidenceQuote: atsPartial.evidenceQuote || 'Partial or related competency mentioned in resume.',
        evidenceRef: atsPartial.evidenceRef || 'ATS Engine',
        matchedKeywords: atsPartial.matchedKeywords || [],
      };
    }

    if (agenticMatched && agenticMatched.status === 'PARTIAL') {
      return {
        status: 'PARTIAL',
        matchType: 'SEMANTIC_PARTIAL',
        evidenceQuote: agenticMatched.evidenceQuote || agenticMatched.reason || 'Partial semantic grounding identified.',
        evidenceRef: agenticMatched.evidenceRef || 'AI Agentic Evaluation',
        matchedKeywords: [],
        reason: agenticMatched.reason,
      };
    }

    // 4. Check Profile Verified Skills & Languages fallback
    const skillMatch = candidate.profile?.skills?.find((s) =>
      reqKeywords.some((k) => k.includes(s.toLowerCase()) || s.toLowerCase().includes(k))
    );
    if (skillMatch) {
      return {
        status: 'PARTIAL',
        matchType: 'PROFILE_SKILL',
        evidenceQuote: `Found verified profile skill: "${skillMatch}"`,
        evidenceRef: 'Candidate Profile Skills',
        matchedKeywords: [skillMatch],
      };
    }

    // 5. Missing / Gaps
    const atsMissing = candidate.ats?.missingRequirements?.find(
      (m) =>
        m.requirementId === req.id ||
        m.requirement.toLowerCase().includes(reqTextNorm) ||
        reqTextNorm.includes(m.requirement.toLowerCase())
    );

    return {
      status: 'MISSING',
      matchType: 'NONE',
      evidenceQuote: atsMissing?.evidenceQuote || 'No verifiable mention or supporting evidence found in document.',
      evidenceRef: 'Document Audit (Gap)',
      matchedKeywords: [],
      reason: 'No evidence detected in parsed text.',
    };
  };

  // Distinct categories from JD requirements
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    (session.parsedJd?.requirements || []).forEach((r) => {
      if (r.category) cats.add(r.category);
    });
    return Array.from(cats);
  }, [session.parsedJd]);

  // Combined Requirements List with evaluations
  const evaluatedRequirements = useMemo(() => {
    const rawReqs = session.parsedJd?.requirements || [];
    if (rawReqs.length === 0) return [];

    return rawReqs.map((req) => {
      const evalA = getCandidateRequirementDetail(candidateA, req);
      const evalB = getCandidateRequirementDetail(candidateB, req);

      // Determine advantage
      let advantage: 'A' | 'B' | 'TIED' = 'TIED';
      const scoreMap = { MATCHED: 2, PARTIAL: 1, MISSING: 0 };
      const scoreA = scoreMap[evalA.status];
      const scoreB = scoreMap[evalB.status];

      if (scoreA > scoreB) advantage = 'A';
      else if (scoreB > scoreA) advantage = 'B';
      else advantage = 'TIED';

      const isDifference = evalA.status !== evalB.status;

      return {
        req,
        evalA,
        evalB,
        advantage,
        isDifference,
      };
    });
  }, [session.parsedJd, candidateA, candidateB]);

  // Filtered Requirements based on user criteria
  const filteredRequirements = useMemo(() => {
    return evaluatedRequirements.filter(({ req, evalA, evalB, isDifference }) => {
      // 1. Text Search Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const textMatch = req.text.toLowerCase().includes(term);
        const catMatch = (req.category || '').toLowerCase().includes(term);
        const quoteAMatch = evalA.evidenceQuote.toLowerCase().includes(term);
        const quoteBMatch = evalB.evidenceQuote.toLowerCase().includes(term);
        const kwAMatch = evalA.matchedKeywords.some((k) => k.toLowerCase().includes(term));
        const kwBMatch = evalB.matchedKeywords.some((k) => k.toLowerCase().includes(term));

        if (!textMatch && !catMatch && !quoteAMatch && !quoteBMatch && !kwAMatch && !kwBMatch) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== 'ALL') {
        if (req.category !== selectedCategory) return false;
      }

      // 3. Status/Difference Mode Filter
      if (reqFilterMode === 'DIFFERENCES') {
        return isDifference;
      }
      if (reqFilterMode === 'MANDATORY') {
        return req.isMandatory;
      }
      if (reqFilterMode === 'BOTH_MATCHED') {
        return evalA.status === 'MATCHED' && evalB.status === 'MATCHED';
      }
      if (reqFilterMode === 'EITHER_GAP') {
        return evalA.status === 'MISSING' || evalB.status === 'MISSING';
      }

      return true;
    });
  }, [evaluatedRequirements, searchTerm, selectedCategory, reqFilterMode]);

  // Toggle expand individual requirement
  const toggleExpandReq = (id: string) => {
    setExpandedReqIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleExpandAll = () => {
    if (expandedReqIds.size === filteredRequirements.length) {
      setExpandedReqIds(new Set());
    } else {
      setExpandedReqIds(new Set(filteredRequirements.map((f) => f.req.id)));
    }
  };

  const getTierBadge = (tier?: RecommendationTier) => {
    if (!tier) return null;
    switch (tier) {
      case 'EXCELLENT_MATCH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-status-matched/10 text-status-matched border border-status-matched/20 whitespace-nowrap">
            Excellent Match
          </span>
        );
      case 'HIGH_MATCH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
            High Match
          </span>
        );
      case 'GOOD_MATCH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-status-partial/10 text-status-partial border border-status-partial/20 whitespace-nowrap">
            Good Match
          </span>
        );
      case 'MODERATE_MATCH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
            Moderate Match
          </span>
        );
      case 'LOW_MATCH':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-status-missing/10 text-status-missing border border-status-missing/20 whitespace-nowrap">
            Low Match
          </span>
        );
    }
  };

  const getStatusBadge = (status: 'MATCHED' | 'PARTIAL' | 'MISSING') => {
    switch (status) {
      case 'MATCHED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-matched/10 text-status-matched border border-status-matched/20">
            <Check className="w-3 h-3 stroke-[2.5]" />
            <span>MATCHED</span>
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-partial/10 text-status-partial border border-status-partial/20">
            <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
            <span>PARTIAL</span>
          </span>
        );
      case 'MISSING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-missing/10 text-status-missing border border-status-missing/20">
            <X className="w-3 h-3 stroke-[2.5]" />
            <span>NOT FOUND</span>
          </span>
        );
    }
  };

  // Comparative Head-to-Head Statistics
  const stats = useMemo(() => {
    if (!candidateA || !candidateB) return null;

    const diffComprehensive = candidateA.comprehensiveScore - candidateB.comprehensiveScore;
    const diffAts = candidateA.atsScore - candidateB.atsScore;
    const diffAgentic = candidateA.agenticScore - candidateB.agenticScore;

    const matchedA = candidateA.ats.matchedRequirements.length;
    const matchedB = candidateB.ats.matchedRequirements.length;

    const partialA = candidateA.ats.partialMatches.length;
    const partialB = candidateB.ats.partialMatches.length;

    const missingA = candidateA.ats.missingRequirements.length;
    const missingB = candidateB.ats.missingRequirements.length;

    let leadA = 0;
    let leadB = 0;
    let tied = 0;

    evaluatedRequirements.forEach((er) => {
      if (er.advantage === 'A') leadA++;
      else if (er.advantage === 'B') leadB++;
      else tied++;
    });

    return {
      diffComprehensive,
      diffAts,
      diffAgentic,
      matchedA,
      matchedB,
      partialA,
      partialB,
      missingA,
      missingB,
      leadA,
      leadB,
      tied,
      totalReqs: evaluatedRequirements.length,
      differencesCount: evaluatedRequirements.filter((e) => e.isDifference).length,
    };
  }, [candidateA, candidateB, evaluatedRequirements]);

  if (!candidateA || !candidateB) {
    return (
      <div className="p-12 text-center border border-default rounded-[8px] bg-surface space-y-3">
        <Scale className="w-8 h-8 text-muted mx-auto" />
        <h3 className="text-sm font-semibold text-primary">Need at least 2 candidates to compare</h3>
        <p className="text-xs text-secondary max-w-sm mx-auto">
          This session currently has fewer than two candidates. Add additional resumes to enable side-by-side evidence contrasting.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Candidate Selection Bar */}
      <div className="rounded-[10px] border border-default bg-surface p-4 sm:p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-default pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-accent/10 text-accent flex items-center justify-center font-bold">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-primary flex items-center gap-2">
                <span>Side-by-Side Candidate Comparison</span>
                <span className="text-xs font-mono font-normal text-muted bg-surface-sunken px-2 py-0.5 rounded border border-default">
                  Evidence Contrast Engine
                </span>
              </h2>
              <p className="text-xs text-secondary font-sans mt-0.5">
                Contrasting verified scores, strengths, and verbatim text quotes against {session.parsedJd?.requirements?.length || 0} JD requirements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSwapCandidates}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-default bg-surface-sunken hover:bg-surface text-primary text-xs font-mono font-medium transition-colors cursor-pointer"
              title="Swap Candidate A and Candidate B"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-accent" />
              <span>Swap Positions</span>
            </button>
          </div>
        </div>

        {/* Candidate Selector Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative">
          {/* Central VS Badge for Large Screens */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-surface border-2 border-accent text-accent font-mono font-bold text-xs items-center justify-center shadow-md">
            VS
          </div>

          {/* Candidate A Card */}
          <div className="rounded-[8px] border-2 border-accent/40 bg-surface-sunken/40 p-4 space-y-3.5 relative">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-accent text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs">
                  A
                </span>
                <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
                  Primary Candidate
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSelectCandidateForDetail(candidateA)}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-accent hover:underline cursor-pointer"
              >
                <span>Inspect Full Profile</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Candidate A Dropdown Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-muted">Select Candidate A:</label>
              <select
                value={selectedAId}
                onChange={(e) => setSelectedAId(e.target.value)}
                className="w-full text-xs font-sans font-semibold bg-surface border border-default rounded-[6px] px-3 py-2 text-primary focus:border-accent focus:outline-none cursor-pointer"
              >
                {sortedCandidates.map((c, idx) => (
                  <option key={c.candidateId} value={c.candidateId}>
                    #{c.rank || idx + 1} {c.candidateName} — {c.comprehensiveScore}% Fit ({c.fileName})
                  </option>
                ))}
              </select>
            </div>

            {/* Candidate A Details Snapshot */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-default/70">
              <div className="p-2 rounded bg-surface border border-default text-center">
                <div className="text-[10px] font-mono text-muted uppercase">Overall Fit</div>
                <div className="text-base font-mono font-bold text-primary mt-0.5">
                  {candidateA.comprehensiveScore}%
                </div>
              </div>
              <div className="p-2 rounded bg-surface border border-default text-center">
                <div className="text-[10px] font-mono text-muted uppercase">ATS Score</div>
                <div className="text-base font-mono font-bold text-primary mt-0.5">
                  {candidateA.atsScore}%
                </div>
              </div>
              <div className="p-2 rounded bg-surface border border-default text-center">
                <div className="text-[10px] font-mono text-muted uppercase">Agentic Score</div>
                <div className="text-base font-mono font-bold text-primary mt-0.5">
                  {candidateA.agenticScore}%
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-sans">
              <div className="flex items-center gap-1.5">
                {getTierBadge(candidateA.recommendation)}
                <span className="text-[11px] font-mono text-secondary">
                  {candidateA.profile?.yearsOfExperience || 'Timeline parsed'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-muted">
                {candidateA.ats.matchedRequirements.length} / {session.parsedJd?.requirements?.length || 0} Matched
              </div>
            </div>
          </div>

          {/* Candidate B Card */}
          <div className="rounded-[8px] border-2 border-default bg-surface-sunken/40 p-4 space-y-3.5 relative">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-secondary text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs">
                  B
                </span>
                <span className="text-xs font-mono font-bold text-secondary uppercase tracking-wider">
                  Benchmark Candidate
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSelectCandidateForDetail(candidateB)}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-accent hover:underline cursor-pointer"
              >
                <span>Inspect Full Profile</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Candidate B Dropdown Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-muted">Select Candidate B:</label>
              <select
                value={selectedBId}
                onChange={(e) => setSelectedBId(e.target.value)}
                className="w-full text-xs font-sans font-semibold bg-surface border border-default rounded-[6px] px-3 py-2 text-primary focus:border-accent focus:outline-none cursor-pointer"
              >
                {sortedCandidates.map((c, idx) => (
                  <option key={c.candidateId} value={c.candidateId}>
                    #{c.rank || idx + 1} {c.candidateName} — {c.comprehensiveScore}% Fit ({c.fileName})
                  </option>
                ))}
              </select>
            </div>

            {/* Candidate B Details Snapshot */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-default/70">
              <div className="p-2 rounded bg-surface border border-default text-center">
                <div className="text-[10px] font-mono text-muted uppercase">Overall Fit</div>
                <div className="text-base font-mono font-bold text-primary mt-0.5">
                  {candidateB.comprehensiveScore}%
                </div>
              </div>
              <div className="p-2 rounded bg-surface border border-default text-center">
                <div className="text-[10px] font-mono text-muted uppercase">ATS Score</div>
                <div className="text-base font-mono font-bold text-primary mt-0.5">
                  {candidateB.atsScore}%
                </div>
              </div>
              <div className="p-2 rounded bg-surface border border-default text-center">
                <div className="text-[10px] font-mono text-muted uppercase">Agentic Score</div>
                <div className="text-base font-mono font-bold text-primary mt-0.5">
                  {candidateB.agenticScore}%
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-sans">
              <div className="flex items-center gap-1.5">
                {getTierBadge(candidateB.recommendation)}
                <span className="text-[11px] font-mono text-secondary">
                  {candidateB.profile?.yearsOfExperience || 'Timeline parsed'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-muted">
                {candidateB.ats.matchedRequirements.length} / {session.parsedJd?.requirements?.length || 0} Matched
              </div>
            </div>
          </div>
        </div>

        {/* 2. Key Head-to-Head Comparison Metrics Strip */}
        {stats && (
          <div className="p-3.5 rounded-[8px] bg-surface border border-default text-xs font-mono">
            <div className="text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center justify-between mb-3 border-b border-default pb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Head-to-Head Advantage Breakdown</span>
              </span>
              <span className="text-muted font-normal">
                {stats.differencesCount} Requirement Discrepancies Detected
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {/* Overall Score Delta */}
              <div className="p-2.5 rounded-[6px] bg-surface-sunken border border-default">
                <div className="text-[10px] text-muted uppercase">Overall Fit Delta</div>
                <div
                  className={`text-sm font-bold mt-1 ${
                    stats.diffComprehensive > 0
                      ? 'text-status-matched'
                      : stats.diffComprehensive < 0
                      ? 'text-accent'
                      : 'text-secondary'
                  }`}
                >
                  {stats.diffComprehensive > 0 ? `+${stats.diffComprehensive}% (Cand A)` : stats.diffComprehensive < 0 ? `+${Math.abs(stats.diffComprehensive)}% (Cand B)` : 'Tied (0%)'}
                </div>
              </div>

              {/* Requirement Leads */}
              <div className="p-2.5 rounded-[6px] bg-surface-sunken border border-default">
                <div className="text-[10px] text-muted uppercase">Criteria Edge</div>
                <div className="text-sm font-bold text-primary mt-1">
                  <span className="text-accent">{stats.leadA}</span> vs{' '}
                  <span className="text-secondary">{stats.leadB}</span>
                  <span className="text-[10px] text-muted ml-1 font-normal">({stats.tied} equal)</span>
                </div>
              </div>

              {/* Matched Count Contrast */}
              <div className="p-2.5 rounded-[6px] bg-surface-sunken border border-default">
                <div className="text-[10px] text-muted uppercase">Fully Matched</div>
                <div className="text-sm font-bold text-primary mt-1">
                  <span>{stats.matchedA}</span> vs <span>{stats.matchedB}</span>
                  <span className="text-[10px] text-muted ml-1 font-normal">of {stats.totalReqs}</span>
                </div>
              </div>

              {/* Critical Gaps Contrast */}
              <div className="p-2.5 rounded-[6px] bg-surface-sunken border border-default">
                <div className="text-[10px] text-muted uppercase">Detected Gaps</div>
                <div className="text-sm font-bold mt-1">
                  <span className={stats.missingA > stats.missingB ? 'text-status-missing' : 'text-primary'}>
                    {stats.missingA}
                  </span>{' '}
                  vs{' '}
                  <span className={stats.missingB > stats.missingA ? 'text-status-missing' : 'text-primary'}>
                    {stats.missingB}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Strengths, Weaknesses & Skill Ecosystem Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Candidate A Strengths & Gaps */}
        <div className="rounded-[8px] border border-default bg-surface p-4 space-y-3.5">
          <div className="flex items-center gap-2 border-b border-default pb-2">
            <span className="w-5 h-5 rounded bg-accent text-white font-mono font-bold text-[11px] flex items-center justify-center">
              A
            </span>
            <h3 className="text-xs font-mono font-bold text-primary uppercase tracking-wider">
              {candidateA.candidateName} Profile Insights
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Strengths */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono font-semibold text-status-matched flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Strengths</span>
              </div>
              <ul className="space-y-1 pl-2 font-sans text-secondary">
                {candidateA.strengths.slice(0, 3).map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-status-matched font-bold mt-0.5">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            {candidateA.weaknesses.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-default/50">
                <div className="text-[11px] font-mono font-semibold text-status-missing flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Caution / Gaps</span>
                </div>
                <ul className="space-y-1 pl-2 font-sans text-secondary">
                  {candidateA.weaknesses.slice(0, 3).map((w, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-status-missing font-bold mt-0.5">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Verified Skills Preview */}
            <div className="space-y-1.5 pt-1 border-t border-default/50">
              <div className="text-[11px] font-mono font-semibold text-primary flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-accent" />
                <span>Core Verified Stack</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(candidateA.profile?.skills || candidateA.ats.matchedKeywords || []).slice(0, 8).map((sk) => (
                  <span
                    key={sk}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-sunken border border-default text-secondary"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Candidate B Strengths & Gaps */}
        <div className="rounded-[8px] border border-default bg-surface p-4 space-y-3.5">
          <div className="flex items-center gap-2 border-b border-default pb-2">
            <span className="w-5 h-5 rounded bg-secondary text-white font-mono font-bold text-[11px] flex items-center justify-center">
              B
            </span>
            <h3 className="text-xs font-mono font-bold text-primary uppercase tracking-wider">
              {candidateB.candidateName} Profile Insights
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Strengths */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono font-semibold text-status-matched flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Strengths</span>
              </div>
              <ul className="space-y-1 pl-2 font-sans text-secondary">
                {candidateB.strengths.slice(0, 3).map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-status-matched font-bold mt-0.5">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            {candidateB.weaknesses.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-default/50">
                <div className="text-[11px] font-mono font-semibold text-status-missing flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Caution / Gaps</span>
                </div>
                <ul className="space-y-1 pl-2 font-sans text-secondary">
                  {candidateB.weaknesses.slice(0, 3).map((w, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-status-missing font-bold mt-0.5">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Verified Skills Preview */}
            <div className="space-y-1.5 pt-1 border-t border-default/50">
              <div className="text-[11px] font-mono font-semibold text-primary flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-secondary" />
                <span>Core Verified Stack</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(candidateB.profile?.skills || candidateB.ats.matchedKeywords || []).slice(0, 8).map((sk) => (
                  <span
                    key={sk}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-sunken border border-default text-secondary"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Filter & Criteria Navigation Bar */}
      <div className="rounded-[8px] border border-default bg-surface p-3.5 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Criteria & Quotes */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Filter requirements, keywords, or evidence quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs font-sans bg-surface-sunken border border-default rounded-[6px] text-primary placeholder:text-muted focus:border-strong focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Segmented Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setReqFilterMode('ALL')}
              className={`px-2.5 py-1 rounded-[6px] border transition-colors cursor-pointer ${
                reqFilterMode === 'ALL'
                  ? 'bg-primary text-white border-primary font-bold shadow-xs'
                  : 'bg-surface-sunken text-secondary border-default hover:text-primary'
              }`}
            >
              All ({evaluatedRequirements.length})
            </button>

            <button
              type="button"
              onClick={() => setReqFilterMode('DIFFERENCES')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] border transition-colors cursor-pointer ${
                reqFilterMode === 'DIFFERENCES'
                  ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              }`}
              title="Show only criteria where Candidate A and Candidate B have differing outcomes"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Differences Only ({stats?.differencesCount || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setReqFilterMode('MANDATORY')}
              className={`px-2.5 py-1 rounded-[6px] border transition-colors cursor-pointer ${
                reqFilterMode === 'MANDATORY'
                  ? 'bg-primary text-white border-primary font-bold shadow-xs'
                  : 'bg-surface-sunken text-secondary border-default hover:text-primary'
              }`}
            >
              Mandatory Only
            </button>

            {/* Category Dropdown */}
            {availableCategories.length > 0 && (
              <div className="flex items-center gap-1 bg-surface-sunken border border-default rounded-[6px] px-2 py-0.5">
                <span className="text-[10px] text-muted">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent text-xs text-primary focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Expand / Collapse All Quotes */}
            <button
              type="button"
              onClick={handleToggleExpandAll}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] border border-default bg-surface hover:bg-surface-sunken text-secondary hover:text-primary text-[11px] font-mono transition-colors cursor-pointer"
            >
              {expandedReqIds.size === filteredRequirements.length ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>Collapse Quotes</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>Expand All Quotes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Requirement-by-Requirement Evidence Comparison Matrix */}
      <div className="space-y-4">
        {filteredRequirements.length === 0 ? (
          <div className="p-10 text-center border border-default rounded-[8px] bg-surface space-y-2">
            <Search className="w-6 h-6 text-muted mx-auto" />
            <h4 className="text-xs font-semibold text-primary">No matching requirements</h4>
            <p className="text-xs text-secondary">
              Try adjusting your search filter or selecting "All" criteria.
            </p>
          </div>
        ) : (
          filteredRequirements.map(({ req, evalA, evalB, advantage, isDifference }, index) => {
            const isExpanded = expandedReqIds.has(req.id);

            return (
              <div
                key={req.id || index}
                className={`rounded-[8px] border bg-surface transition-all overflow-hidden shadow-xs ${
                  isDifference
                    ? 'border-amber-400/50 dark:border-amber-600/40 bg-amber-500/[0.02]'
                    : 'border-default'
                }`}
              >
                {/* Requirement Header Bar */}
                <div
                  onClick={() => toggleExpandReq(req.id)}
                  className="p-3.5 bg-surface-sunken/60 border-b border-default flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer hover:bg-surface-sunken transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
                    <span className="font-mono text-xs font-bold text-muted shrink-0 w-6">
                      #{index + 1}
                    </span>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="text-xs font-semibold text-primary font-sans">
                        {req.text}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-muted">
                        {req.category && (
                          <span className="px-1.5 py-0.2 rounded bg-surface border border-default text-secondary">
                            {req.category}
                          </span>
                        )}
                        {req.isMandatory && (
                          <span className="px-1.5 py-0.2 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-bold">
                            MANDATORY
                          </span>
                        )}
                        {req.weight ? (
                          <span>Weight: {req.weight}x</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Advantage Flag & Accordion Toggle */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {advantage === 'A' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent/10 text-accent border border-accent/20">
                        <span>A Leads</span>
                      </span>
                    )}
                    {advantage === 'B' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-secondary/10 text-secondary border border-default">
                        <span>B Leads</span>
                      </span>
                    )}
                    {advantage === 'TIED' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-muted bg-surface border border-default">
                        <span>Tied</span>
                      </span>
                    )}

                    <button
                      type="button"
                      className="p-1 rounded text-muted hover:text-primary transition-colors"
                      title={isExpanded ? 'Collapse quotes' : 'Expand quotes'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Side-by-Side Candidate Columns for this Requirement */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-default text-xs">
                  {/* Candidate A Column */}
                  <div
                    className={`p-4 space-y-2.5 ${
                      advantage === 'A' ? 'bg-accent/[0.03]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-accent text-white font-mono font-bold text-[10px] flex items-center justify-center">
                          A
                        </span>
                        <span className="font-semibold text-primary truncate max-w-[140px]">
                          {candidateA.candidateName}
                        </span>
                      </div>
                      <div>{getStatusBadge(evalA.status)}</div>
                    </div>

                    {/* Matched Keywords Tags */}
                    {evalA.matchedKeywords.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono text-secondary">
                        <span className="text-muted">Keywords:</span>
                        {evalA.matchedKeywords.map((kw, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.2 rounded bg-surface-sunken border border-default text-primary"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Verbatim Grounded Quote / Context Box */}
                    <div className="p-2.5 rounded-[6px] bg-surface-sunken border border-default space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted">
                        <span>VERBATIM EVIDENCE:</span>
                        <span>{evalA.evidenceRef}</span>
                      </div>
                      <div className="text-xs text-primary font-mono italic leading-relaxed">
                        "{evalA.evidenceQuote}"
                      </div>
                      {evalA.reason && evalA.reason !== evalA.evidenceQuote && (
                        <div className="text-[11px] text-secondary font-sans pt-1 border-t border-default/50">
                          {evalA.reason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Candidate B Column */}
                  <div
                    className={`p-4 space-y-2.5 ${
                      advantage === 'B' ? 'bg-secondary/[0.03]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-secondary text-white font-mono font-bold text-[10px] flex items-center justify-center">
                          B
                        </span>
                        <span className="font-semibold text-primary truncate max-w-[140px]">
                          {candidateB.candidateName}
                        </span>
                      </div>
                      <div>{getStatusBadge(evalB.status)}</div>
                    </div>

                    {/* Matched Keywords Tags */}
                    {evalB.matchedKeywords.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono text-secondary">
                        <span className="text-muted">Keywords:</span>
                        {evalB.matchedKeywords.map((kw, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.2 rounded bg-surface-sunken border border-default text-primary"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Verbatim Grounded Quote / Context Box */}
                    <div className="p-2.5 rounded-[6px] bg-surface-sunken border border-default space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted">
                        <span>VERBATIM EVIDENCE:</span>
                        <span>{evalB.evidenceRef}</span>
                      </div>
                      <div className="text-xs text-primary font-mono italic leading-relaxed">
                        "{evalB.evidenceQuote}"
                      </div>
                      {evalB.reason && evalB.reason !== evalB.evidenceQuote && (
                        <div className="text-[11px] text-secondary font-sans pt-1 border-t border-default/50">
                          {evalB.reason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

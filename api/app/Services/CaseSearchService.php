<?php

namespace App\Services;

use App\Enums\CaseStatus;
use App\Enums\RiskLevel;
use App\Models\SafetyCase;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator as ConcretePaginator;
use Illuminate\Support\Collection;

class CaseSearchService
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function searchCases(User $user, array $filters, int $perPage = 15, bool $onlyOwnReports = false): LengthAwarePaginator
    {
        $query = SafetyCase::query()
            ->forOrganization($user->organization_id)
            ->with($this->listRelations())
            ->withExists(['actions as is_user_action_pic' => fn (Builder $q) => $q->where('pic_user_id', $user->id)]);

        if ($onlyOwnReports) {
            $query->where('reporter_id', $user->id);
        }

        $this->applyStructuredFilters($query, $filters);

        $keyword = trim((string) ($filters['q'] ?? ''));
        if ($keyword === '') {
            return $query->latest('reported_at')->latest('id')->paginate($perPage);
        }

        return $this->applyTypoTolerantSearch($query, $keyword, $perPage);
    }

    /**
     * Find similar historical cases using pure text similarity (no AI, B-20).
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function findSimilarCases(SafetyCase $targetCase, int $limit = 5): Collection
    {
        $targetCase->loadMissing(['machine:id,code,name', 'category:id,name', 'caseType:id,name']);
        $targetBlob = $this->buildCaseSearchBlob($targetCase);

        $candidates = SafetyCase::query()
            ->forOrganization($targetCase->organization_id)
            ->whereKeyNot($targetCase->id)
            ->whereNotIn('status', [CaseStatus::Rejected->value, CaseStatus::Duplicate->value])
            ->with(['machine:id,code,name', 'category:id,name', 'caseType:id,name'])
            ->latest('reported_at')
            ->limit(250)
            ->get();

        $scored = $candidates
            ->map(function (SafetyCase $candidate) use ($targetCase, $targetBlob): array {
                $candidateBlob = $this->buildCaseSearchBlob($candidate);
                $textScore = $this->phraseSimilarity($targetBlob, $candidateBlob);

                $reasons = [];
                $bonus = 0.0;

                if ($candidate->machine_id === $targetCase->machine_id) {
                    $bonus += 0.15;
                    $reasons[] = 'Mesin sama';
                }

                if ($targetCase->category_id !== null && $candidate->category_id === $targetCase->category_id) {
                    $bonus += 0.10;
                    $reasons[] = 'Kategori sama';
                }

                if ($textScore > 0.15) {
                    $reasons[] = 'Kemiripan teks gejala/penyebab';
                }

                if ($candidate->status === CaseStatus::Closed) {
                    $bonus += 0.05;
                }

                $combinedScore = min(1.0, $textScore + $bonus);

                return [
                    'case' => $candidate,
                    'text_score' => $textScore,
                    'combined_score' => $combinedScore,
                    'reasons' => $reasons,
                ];
            })
            ->filter(fn (array $item) => $item['text_score'] >= 0.12 || ($item['combined_score'] >= 0.25 && $item['reasons'] !== []))
            ->sortByDesc('combined_score')
            ->take(max(1, min($limit, 10)))
            ->values();

        return $scored->map(fn (array $item): array => [
            'id' => $item['case']->id,
            'case_number' => $item['case']->case_number,
            'status' => $item['case']->status->value,
            'status_label' => $item['case']->status->label(),
            'description' => $item['case']->description,
            'root_cause_category' => $item['case']->root_cause_category,
            'root_cause_summary' => $item['case']->root_cause_summary,
            'learning_summary' => $item['case']->learning_summary,
            'machine' => $item['case']->machine ? [
                'id' => $item['case']->machine->id,
                'code' => $item['case']->machine->code,
                'name' => $item['case']->machine->name,
            ] : null,
            'category' => $item['case']->category ? [
                'id' => $item['case']->category->id,
                'name' => $item['case']->category->name,
            ] : null,
            'reported_at' => $item['case']->reported_at?->toIso8601String(),
            'similarity_percent' => (int) round($item['combined_score'] * 100),
            'matching_reasons' => $item['reasons'],
            'method' => 'text_similarity',
        ]);
    }

    /**
     * @return list<string>
     */
    public function listRelations(): array
    {
        return [
            'site:id,name,code',
            'area:id,name,code,pic_user_id',
            'area.picUser:id,name,email,role,job_title',
            'machine:id,code,name,qr_token',
            'reporter:id,name,email,role,job_title',
            'caseType:id,code,name,is_incident',
            'category:id,code,name',
            'assignedPic:id,name,email,role,job_title',
            'attachments',
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyStructuredFilters(Builder $query, array $filters): void
    {
        if (! empty($filters['status'])) {
            $rawStatuses = explode(',', (string) $filters['status']);
            $mapped = array_values(array_filter(array_map(
                fn (string $val) => CaseStatus::fromInput($val)?->value,
                $rawStatuses,
            )));

            if ($mapped !== []) {
                $query->whereIn('status', $mapped);
            }
        }

        if (! empty($filters['risk_level'])) {
            $level = RiskLevel::fromInput((string) $filters['risk_level']);
            if ($level) {
                $query->where('risk_level', $level->value);
            }
        }

        foreach (['machine_id', 'site_id', 'area_id', 'case_type_id', 'category_id'] as $field) {
            if (! empty($filters[$field])) {
                $query->where($field, (int) $filters[$field]);
            }
        }

        if (isset($filters['is_machine_stopped']) && $filters['is_machine_stopped'] !== '') {
            $query->where('is_machine_stopped', filter_var($filters['is_machine_stopped'], FILTER_VALIDATE_BOOLEAN));
        }

        if (isset($filters['has_affected_people']) && $filters['has_affected_people'] !== '') {
            $query->where('has_affected_people', filter_var($filters['has_affected_people'], FILTER_VALIDATE_BOOLEAN));
        }

        if (! empty($filters['date_from']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $filters['date_from'])) {
            $query->whereDate('reported_at', '>=', (string) $filters['date_from']);
        }

        if (! empty($filters['date_to']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $filters['date_to'])) {
            $query->whereDate('reported_at', '<=', (string) $filters['date_to']);
        }
    }

    private function applyTypoTolerantSearch(Builder $query, string $keyword, int $perPage): LengthAwarePaginator
    {
        $driver = $query->getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            $escaped = addcslashes($keyword, '\\%_');
            $like = '%'.$escaped.'%';
            $query->where(function (Builder $sub) use ($keyword, $like): void {
                $sub->where('case_number', 'ILIKE', $like)
                    ->orWhere('description', 'ILIKE', $like)
                    ->orWhere('root_cause_summary', 'ILIKE', $like)
                    ->orWhere('learning_summary', 'ILIKE', $like)
                    ->orWhereRaw('similarity(description, ?) > 0.15', [$keyword])
                    ->orWhereRaw('word_similarity(?, description) > 0.35', [$keyword])
                    ->orWhereHas('machine', fn (Builder $m) => $m
                        ->where('name', 'ILIKE', $like)
                        ->orWhere('code', 'ILIKE', $like)
                        ->orWhereRaw('word_similarity(?, name) > 0.35', [$keyword]));
            })
                ->orderByRaw('GREATEST(similarity(description, ?), word_similarity(?, description)) DESC', [$keyword, $keyword])
                ->latest('reported_at');

            return $query->paginate($perPage);
        }

        // Cross-engine fuzzy scoring for SQLite / MySQL (handles typos like "konvayor" -> "konveyor")
        $candidates = $query
            ->latest('reported_at')
            ->limit(1000)
            ->get();

        $matched = $candidates
            ->map(function (SafetyCase $case) use ($keyword): array {
                $blob = $this->buildCaseSearchBlob($case);
                $score = $this->queryMatchScore($keyword, $blob);

                return ['case' => $case, 'score' => $score];
            })
            ->filter(fn (array $item) => $item['score'] > 0.0)
            ->sortByDesc(fn (array $item) => [$item['score'], $item['case']->reported_at?->timestamp ?? 0])
            ->values();

        $page = ConcretePaginator::resolveCurrentPage();
        $total = $matched->count();
        $slice = $matched->slice(($page - 1) * $perPage, $perPage)
            ->map(fn (array $item) => $item['case'])
            ->values();

        return new ConcretePaginator(
            $slice,
            $total,
            $perPage,
            $page,
            ['path' => ConcretePaginator::resolveCurrentPath()],
        );
    }

    private function buildCaseSearchBlob(SafetyCase $case): string
    {
        return implode(' ', array_filter([
            $case->case_number,
            $case->description,
            $case->root_cause_category,
            $case->root_cause_summary,
            $case->learning_summary,
            $case->machine?->code,
            $case->machine?->name,
            $case->category?->name,
            $case->caseType?->name,
        ]));
    }

    private function queryMatchScore(string $query, string $haystack): float
    {
        $normalizedQuery = $this->normalizeText($query);
        $normalizedHaystack = $this->normalizeText($haystack);

        if ($normalizedQuery === '' || $normalizedHaystack === '') {
            return 0.0;
        }

        if (str_contains($normalizedHaystack, $normalizedQuery)) {
            return 1.0;
        }

        $queryTokens = $this->tokenize($normalizedQuery);
        $haystackWords = $this->tokenize($normalizedHaystack);

        if ($queryTokens === [] || $haystackWords === []) {
            return 0.0;
        }

        $matchedTokens = 0;
        $totalTokenScore = 0.0;

        foreach ($queryTokens as $token) {
            $bestWordScore = $this->bestTokenMatchScore($token, $haystackWords);
            if ($bestWordScore >= 0.62) {
                $matchedTokens++;
                $totalTokenScore += $bestWordScore;
            }
        }

        if ($matchedTokens === 0) {
            return 0.0;
        }

        // Require all query tokens when 1-2 tokens, or majority for multi-word queries
        $requiredMatches = count($queryTokens) <= 2 ? count($queryTokens) : (int) ceil(count($queryTokens) * 0.6);
        if ($matchedTokens < $requiredMatches) {
            return 0.0;
        }

        return $totalTokenScore / count($queryTokens);
    }

    /**
     * @param  list<string>  $haystackWords
     */
    private function bestTokenMatchScore(string $token, array $haystackWords): float
    {
        $best = 0.0;
        $tokenLen = strlen($token);

        foreach ($haystackWords as $word) {
            if ($word === $token) {
                return 1.0;
            }

            if (str_contains($word, $token)) {
                $best = max($best, 0.92);

                continue;
            }

            $maxLen = max($tokenLen, strlen($word));
            if ($maxLen < 3 || abs($tokenLen - strlen($word)) > 3) {
                continue;
            }

            $distance = levenshtein($token, $word);
            $maxAllowedDistance = $maxLen <= 4 ? 1 : ($maxLen <= 8 ? 2 : 3);
            if ($distance <= $maxAllowedDistance) {
                $levScore = 1.0 - ($distance / $maxLen);
                $best = max($best, $levScore);
            }

            similar_text($token, $word, $percent);
            if ($percent >= 70.0) {
                $best = max($best, $percent / 100.0);
            }
        }

        return $best;
    }

    private function phraseSimilarity(string $textA, string $textB): float
    {
        $wordsA = array_unique($this->tokenize($this->normalizeText($textA)));
        $wordsB = array_unique($this->tokenize($this->normalizeText($textB)));

        if ($wordsA === [] || $wordsB === []) {
            return 0.0;
        }

        $matches = 0.0;
        foreach ($wordsA as $word) {
            if (strlen($word) < 3) {
                continue;
            }

            $score = $this->bestTokenMatchScore($word, $wordsB);
            if ($score >= 0.72) {
                $matches += $score;
            }
        }

        $significantCount = count(array_filter($wordsA, fn (string $w) => strlen($w) >= 3));
        if ($significantCount === 0) {
            return 0.0;
        }

        return min(1.0, $matches / $significantCount);
    }

    private function normalizeText(string $text): string
    {
        return preg_replace('/[^a-z0-9\s]+/', ' ', mb_strtolower($text)) ?? '';
    }

    /**
     * @return list<string>
     */
    private function tokenize(string $normalized): array
    {
        $parts = preg_split('/\s+/', trim($normalized)) ?: [];

        return array_values(array_filter($parts, fn (string $w) => $w !== ''));
    }
}

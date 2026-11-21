<?php

namespace App\Services\Ai;

use App\Exceptions\AiUnavailableException;

/**
 * Parses free-form model output into a JSON object and normalises common
 * code-fence wrappers. Never trusts the payload before feature-level validation.
 */
class AiResponseParser
{
    /**
     * @return array<string, mixed>
     */
    public function parseObject(string $content): array
    {
        $text = trim($content);

        // Strip reasoning/thinking blocks emitted by reasoning models (e.g. <think>...</think>)
        $text = preg_replace('/<(?:think|reasoning)>.*?<\/(?:think|reasoning)>/is', '', $text) ?? $text;
        $text = trim($text);

        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/i', $text, $fenceMatch) === 1) {
            $text = trim($fenceMatch[1]);
        }

        $decoded = $this->decodeJson($text);

        if ($decoded === null) {
            $firstBrace = strpos($text, '{');
            $lastBrace = strrpos($text, '}');

            if ($firstBrace !== false && $lastBrace !== false && $lastBrace > $firstBrace) {
                $candidate = substr($text, $firstBrace, $lastBrace - $firstBrace + 1);
                $decoded = $this->decodeJson($candidate);
            }
        }

        if ($decoded === null) {
            throw new AiUnavailableException('Respons AI tidak dapat dibaca.');
        }

        if (! is_array($decoded) || array_is_list($decoded)) {
            throw new AiUnavailableException('Respons AI tidak sesuai dengan format yang diharapkan.');
        }

        /** @var array<string, mixed> $decoded */
        return $decoded;
    }

    private function decodeJson(string $text): mixed
    {
        try {
            return json_decode($text, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }
    }

    /**
     * @return list<string>
     */
    public function stringList(mixed $value, int $maxItems, int $maxLength): array
    {
        if (! is_array($value) || array_is_list($value) === false) {
            return [];
        }

        $items = [];
        foreach ($value as $item) {
            if (! is_string($item)) {
                continue;
            }

            $clean = trim(strip_tags($item));
            if ($clean === '') {
                continue;
            }

            $items[] = mb_substr($clean, 0, $maxLength);

            if (count($items) >= $maxItems) {
                break;
            }
        }

        return $items;
    }

    public function text(mixed $value, int $maxLength, ?string $fallback = null): ?string
    {
        if (! is_string($value)) {
            return $fallback;
        }

        $clean = trim(strip_tags($value));

        if ($clean === '') {
            return $fallback;
        }

        return mb_substr($clean, 0, $maxLength);
    }
}

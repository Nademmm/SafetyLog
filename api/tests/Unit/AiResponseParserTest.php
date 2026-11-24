<?php

namespace Tests\Unit;

use App\Exceptions\AiUnavailableException;
use App\Services\Ai\AiResponseParser;
use PHPUnit\Framework\TestCase;

class AiResponseParserTest extends TestCase
{
    public function test_parses_json_code_fence(): void
    {
        $result = (new AiResponseParser)->parseObject("```json\n{\"headline\":\"Ringkasan\"}\n```");

        $this->assertSame(['headline' => 'Ringkasan'], $result);
    }

    public function test_strips_think_block_before_parsing_json(): void
    {
        $raw = "<think>\nModel reasoning mentioning {\"ignored\":true} format.\n</think>\n\n{\"headline\":\"Ringkasan\",\"ok\":true}";
        $result = (new AiResponseParser)->parseObject($raw);

        $this->assertSame(['headline' => 'Ringkasan', 'ok' => true], $result);
    }

    public function test_strips_think_block_and_code_fence(): void
    {
        $raw = "<think>Analyzing...</think>\n```json\n{\"category_id\":2,\"severity\":4}\n```";
        $result = (new AiResponseParser)->parseObject($raw);

        $this->assertSame(['category_id' => 2, 'severity' => 4], $result);
    }

    public function test_rejects_invalid_json(): void
    {
        $this->expectException(AiUnavailableException::class);
        $this->expectExceptionMessage('tidak dapat dibaca');

        (new AiResponseParser)->parseObject('{broken json');
    }

    public function test_rejects_json_list(): void
    {
        $this->expectException(AiUnavailableException::class);

        (new AiResponseParser)->parseObject('[1,2,3]');
    }

    public function test_string_list_is_normalised_and_limited(): void
    {
        $result = (new AiResponseParser)->stringList([
            '  <b>Aman</b>  ',
            42,
            '',
            'Kedua',
            'Ketiga',
        ], 2, 20);

        $this->assertSame(['Aman', 'Kedua'], $result);
    }

    public function test_string_list_wraps_single_string_response(): void
    {
        $result = (new AiResponseParser)->stringList('  <b>Alasan tunggal</b>  ', 3, 200);

        $this->assertSame(['Alasan tunggal'], $result);
    }

    public function test_strips_unclosed_think_block_before_json(): void
    {
        $raw = "<think>\nReasoning without closing tag\n{\"headline\":\"Ringkasan\"}";
        $result = (new AiResponseParser)->parseObject($raw);

        $this->assertSame(['headline' => 'Ringkasan'], $result);
    }
}

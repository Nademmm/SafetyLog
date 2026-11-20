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
}

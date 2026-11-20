<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;
use Throwable;

/**
 * Failure of the AI assistant. It never changes the underlying case workflow.
 */
class AiUnavailableException extends RuntimeException
{
    public function __construct(
        string $message = 'Bantuan AI sedang tidak tersedia. Silakan coba lagi nanti.',
        public readonly string $errorCode = 'AI_UNAVAILABLE',
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'error_code' => $this->errorCode,
        ], 503);
    }
}

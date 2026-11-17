<?php

namespace App\Http\Requests\Actions;

use App\Http\Requests\Concerns\ValidatesPhotoUploads;
use Illuminate\Foundation\Http\FormRequest;

class CompleteCaseActionRequest extends FormRequest
{
    use ValidatesPhotoUploads;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'completion_note' => ['required', 'string', 'min:3', 'max:5000'],
            ...$this->photoUploadRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'completion_note.required' => 'Catatan hasil tindakan wajib diisi.',
            'completion_note.min' => 'Catatan hasil minimal 3 karakter.',
            ...$this->photoUploadMessages(),
        ];
    }
}

<?php

namespace App\Http\Requests\Cases;

use App\Http\Requests\Concerns\ValidatesPhotoUploads;
use Illuminate\Foundation\Http\FormRequest;

class StoreSafetyCaseRequest extends FormRequest
{
    use ValidatesPhotoUploads;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $updates = [];

        if ($this->has('description') && is_string($this->input('description'))) {
            $updates['description'] = trim($this->input('description'));
        }

        if ($this->has('qr_token')) {
            $rawToken = is_string($this->input('qr_token')) ? trim($this->input('qr_token')) : $this->input('qr_token');
            $updates['qr_token'] = $rawToken === '' ? null : $rawToken;
        }

        foreach (['is_machine_stopped', 'has_affected_people'] as $boolField) {
            if ($this->has($boolField)) {
                $updates[$boolField] = $this->normalizeBooleanInput($this->input($boolField));
            }
        }

        if ($updates !== []) {
            $this->merge($updates);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'machine_id' => ['required_without:qr_token', 'nullable', 'integer'],
            'qr_token' => ['required_without:machine_id', 'nullable', 'string', 'max:64'],
            'case_type_id' => ['required', 'integer'],
            'description' => ['required', 'string', 'min:5', 'max:5000'],
            'is_machine_stopped' => ['nullable', 'boolean'],
            'has_affected_people' => ['nullable', 'boolean'],
            'report_duration_seconds' => ['nullable', 'integer', 'min:0', 'max:86400'],
            ...$this->photoUploadRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'machine_id.required_without' => 'Mesin wajib dipilih.',
            'qr_token.required_without' => 'Mesin atau kode QR mesin wajib dipilih.',
            'case_type_id.required' => 'Jenis kasus wajib dipilih.',
            'description.required' => 'Deskripsi kejadian wajib diisi.',
            'description.min' => 'Deskripsi minimal 5 karakter.',
            'report_duration_seconds.integer' => 'Durasi pelaporan harus berupa angka detik.',
            ...$this->photoUploadMessages(),
        ];
    }

    private function normalizeBooleanInput(mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_bool($value)) {
            return $value;
        }

        if (is_string($value)) {
            $parsed = filter_var(trim($value), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($parsed !== null) {
                return $parsed;
            }
        }

        return $value;
    }
}

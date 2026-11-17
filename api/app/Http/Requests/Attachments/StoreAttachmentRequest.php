<?php

namespace App\Http\Requests\Attachments;

use App\Http\Requests\Concerns\ValidatesPhotoUploads;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreAttachmentRequest extends FormRequest
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
        return $this->photoUploadRules();
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return $this->photoUploadMessages();
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $count = count((array) $this->file('photos', [])) + ($this->hasFile('photo') ? 1 : 0);
            if ($count === 0) {
                $validator->errors()->add('photos', 'Minimal satu berkas foto harus dipilih untuk diunggah.');
            }
            if ($count > 5) {
                $validator->errors()->add('photos', 'Total foto yang diunggah dalam satu permintaan maksimal 5 berkas.');
            }
        });
    }
}

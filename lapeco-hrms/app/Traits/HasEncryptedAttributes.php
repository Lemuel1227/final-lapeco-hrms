<?php

namespace App\Traits;

use App\Services\EncryptionService;

trait HasEncryptedAttributes
{
    /**
     * Get the list of encrypted attributes
     *
     * @return array
     */
    public function getEncryptedAttributes(): array
    {
        return property_exists($this, 'encrypted') ? $this->encrypted : [];
    }

    /**
     * Get an attribute with automatic decryption
     *
     * @param string $key
     * @return mixed
     */
    public function getAttribute($key)
    {
        $value = parent::getAttribute($key);

        // If this attribute should be encrypted, decrypt it
        if (in_array($key, $this->getEncryptedAttributes()) && !is_null($value)) {
            return EncryptionService::decrypt($value);
        }

        return $value;
    }

    /**
     * Set an attribute with automatic encryption
     *
     * @param string $key
     * @param mixed $value
     * @return mixed
     */
    public function setAttribute($key, $value)
    {
        // If this attribute should be encrypted, encrypt it
        if (in_array($key, $this->getEncryptedAttributes()) && !is_null($value) && $value !== '') {
            $value = EncryptionService::encrypt($value);
        }

        return parent::setAttribute($key, $value);
    }

    /**
     * Get array representation with decrypted values
     *
     * @return array
     */
    public function attributesToArray()
    {
        $attributes = parent::attributesToArray();

        foreach ($this->getEncryptedAttributes() as $key) {
            if (isset($attributes[$key]) && !is_null($attributes[$key])) {
                $attributes[$key] = EncryptionService::decrypt($attributes[$key]);
            }
        }

        return $attributes;
    }
}

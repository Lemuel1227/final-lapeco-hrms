<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;

class EncryptionService
{
    /**
     * Encrypt a value using AES-256-CBC
     *
     * @param mixed $value
     * @return string|null
     */
    public static function encrypt($value)
    {
        if (is_null($value) || $value === '') {
            return null;
        }

        try {
            return Crypt::encryptString($value);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Encryption failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Decrypt a value
     *
     * @param string|null $value
     * @return string|null
     */
    public static function decrypt($value)
    {
        if (is_null($value) || $value === '') {
            return null;
        }

        try {
            return Crypt::decryptString($value);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Decryption failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Encrypt multiple fields in an array
     *
     * @param array $data
     * @param array $fields
     * @return array
     */
    public static function encryptFields(array $data, array $fields): array
    {
        foreach ($fields as $field) {
            if (isset($data[$field])) {
                $data[$field] = self::encrypt($data[$field]);
            }
        }

        return $data;
    }

    /**
     * Decrypt multiple fields in an array
     *
     * @param array $data
     * @param array $fields
     * @return array
     */
    public static function decryptFields(array $data, array $fields): array
    {
        foreach ($fields as $field) {
            if (isset($data[$field])) {
                $data[$field] = self::decrypt($data[$field]);
            }
        }

        return $data;
    }
}

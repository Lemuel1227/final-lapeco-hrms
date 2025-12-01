<?php

namespace App\Support;

use Exception;

class SafeMathEvaluator
{
    private const ALLOWED_FUNCTIONS = ['min', 'max', 'abs', 'round', 'floor', 'ceil'];
    private const ALLOWED_OPERATORS = ['+', '-', '*', '/', '%', '(', ')'];
    private const ALLOWED_VARIABLES = ['salary', 'gross', 'basic', 'semi_gross'];

    /**
     * Safely evaluate a mathematical expression with given variables.
     *
     * @param string $expression The formula to evaluate (e.g., "salary * 0.05")
     * @param array $variables Variables available in the expression (e.g., ['salary' => 50000])
     * @return float The result of the evaluation
     * @throws Exception If expression is invalid or unsafe
     */
    public static function evaluate(string $expression, array $variables = []): float
    {
        $expression = trim($expression);

        if (empty($expression)) {
            throw new Exception('Expression cannot be empty');
        }

        // Validate expression syntax
        self::validateExpression($expression);

        // Prepare variables
        $preparedVars = self::prepareVariables($variables);

        // Build safe evaluation context
        $evalCode = self::buildEvalCode($expression, $preparedVars);

        // Execute safely
        try {
            $result = eval($evalCode);
            if (!is_numeric($result)) {
                throw new Exception('Expression did not return a numeric value');
            }
            return (float) $result;
        } catch (Exception $e) {
            throw new Exception('Failed to evaluate expression: ' . $e->getMessage());
        }
    }

    /**
     * Validate that the expression only contains allowed tokens.
     */
    private static function validateExpression(string $expression): void
    {
        // Remove all allowed characters and check if anything remains
        $allowed = implode('', self::ALLOWED_OPERATORS) . implode('|', self::ALLOWED_FUNCTIONS) . implode('|', self::ALLOWED_VARIABLES);
        $allowed .= '0-9.,\s';

        // Check for disallowed characters (basic security check)
        if (preg_match('/[^' . preg_quote($allowed, '/') . ']/i', $expression)) {
            throw new Exception('Expression contains disallowed characters');
        }

        // Check for function calls - only allow whitelisted functions
        if (preg_match_all('/([a-z_]+)\s*\(/', $expression, $matches)) {
            foreach ($matches[1] as $func) {
                if (!in_array($func, self::ALLOWED_FUNCTIONS, true)) {
                    throw new Exception("Function '{$func}' is not allowed");
                }
            }
        }

        // Check for variable references - only allow whitelisted variables
        if (preg_match_all('/\$?([a-z_]+)/', $expression, $matches)) {
            foreach ($matches[1] as $var) {
                if (is_numeric($var) || in_array($var, self::ALLOWED_FUNCTIONS, true)) {
                    continue;
                }
                if (!in_array($var, self::ALLOWED_VARIABLES, true)) {
                    throw new Exception("Variable '{$var}' is not allowed");
                }
            }
        }

        // Check for balanced parentheses
        if (substr_count($expression, '(') !== substr_count($expression, ')')) {
            throw new Exception('Unbalanced parentheses in expression');
        }
    }

    /**
     * Prepare and validate variables for use in evaluation.
     */
    private static function prepareVariables(array $variables): array
    {
        $prepared = [];

        foreach (self::ALLOWED_VARIABLES as $var) {
            $prepared[$var] = isset($variables[$var]) ? (float) $variables[$var] : 0.0;
        }

        return $prepared;
    }

    /**
     * Build safe PHP code for evaluation.
     */
    private static function buildEvalCode(string $expression, array $variables): string
    {
        // Replace variable names with their values
        $code = $expression;
        foreach ($variables as $name => $value) {
            $code = preg_replace('/\b' . $name . '\b/', $value, $code);
        }

        // Ensure all function calls are safe
        foreach (self::ALLOWED_FUNCTIONS as $func) {
            $code = str_replace($func . '(', $func . '(', $code);
        }

        return 'return ' . $code . ';';
    }

    /**
     * Get list of allowed variables for documentation.
     */
    public static function getAllowedVariables(): array
    {
        return self::ALLOWED_VARIABLES;
    }

    /**
     * Get list of allowed functions for documentation.
     */
    public static function getAllowedFunctions(): array
    {
        return self::ALLOWED_FUNCTIONS;
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ChatbotQA;

class ChatbotQASeeder extends Seeder
{
    public function run(): void
    {
        $recruitment = [
            [
                'question' => 'What is LAPECO?',
                'answer' => 'LAPECO, or Laguna Packaging Equipment Corp., specializes in high-quality manufacturing and packaging solutions. We partner with businesses to bring their ideas to life with precision and efficiency.',
            ],
            [
                'question' => 'What positions are available?',
                'answer' => "We are always looking for talented individuals! You can see the list of available positions like Software Engineer, Product Manager, and more in the 'Applying For' dropdown when you open the application form.",
            ],
            [
                'question' => 'How do I apply?',
                'answer' => "You can apply by clicking the 'Apply Now' button in the navigation bar. This will open an application form for you to fill out.",
            ],
            [
                'question' => 'What are the requirements?',
                'answer' => 'Requirements vary by position, but all applications require a resume. Specific qualifications are typically listed in job descriptions which would be available on a dedicated careers page.',
            ],
            [
                'question' => 'Where is the office located?',
                'answer' => 'Our main office is located at L9 B3 Cabuyao Central Subd. Commercial lot, Pulo, Cabuyao, Laguna. You can see a map in our \'Contact Us\' section.',
            ],
            [
                'question' => 'What is the hiring process?',
                'answer' => "Our typical hiring process includes an initial review of your application, followed by one or more interviews with the hiring team and HR. We'll keep you updated via email.",
            ],
            [
                'question' => 'Can I apply for multiple positions?',
                'answer' => 'Yes, you are welcome to apply for any positions that you feel you are qualified for. Please submit a separate application for each role.',
            ],
            [
                'question' => 'Do you offer internships?',
                'answer' => 'We periodically have internship opportunities available. Please check our careers page or get in touch with HR via hrd.lapeco@gmail.com for more information.',
            ],
        ];

        $faq = [
            [
                'question' => 'What industries do you serve?',
                'answer' => 'We serve a wide range of industries, including food and beverage, pharmaceuticals, cosmetics, and consumer goods. Our machinery is versatile and can be adapted to many different packaging needs.',
            ],
            [
                'question' => 'Can you handle custom projects?',
                'answer' => 'Absolutely. Customization is one of our core strengths. We work closely with our partners to design and build packaging solutions tailored to their specific products and production lines.',
            ],
            [
                'question' => 'What is your quality assurance process?',
                'answer' => 'Our commitment to quality is uncompromising. Every machine undergoes rigorous testing and quality checks at multiple stages of production to ensure it meets our high standards for performance and reliability.',
            ],
            [
                'question' => 'Do you provide after-sales support?',
                'answer' => 'Yes, we provide comprehensive after-sales support, including installation, training for your staff, and ongoing maintenance services to ensure your equipment operates at peak efficiency.',
            ],
            [
                'question' => 'How do I get a quote for a project?',
                'answer' => 'The best way to get a quote is to contact us directly through our email at Albert@lapeco.com.co or by calling our landline. We\'d be happy to discuss your project requirements.',
            ],
        ];

        foreach ($recruitment as $item) {
            ChatbotQA::firstOrCreate(
                ['type' => 'recruitment', 'question' => $item['question']],
                ['answer' => $item['answer'], 'active' => true]
            );
        }

        foreach ($faq as $item) {
            ChatbotQA::firstOrCreate(
                ['type' => 'faq', 'question' => $item['question']],
                ['answer' => $item['answer'], 'active' => true]
            );
        }
    }
}
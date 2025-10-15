export const evaluationFactorsConfig = [
  // --- Criteria with Rating Scale Items ---
  { 
    id: 'criterion_1',
    type: 'criterion',
    title: 'Attendance (Pagpasok sa Trabaho)',
    items: [
      { id: 'factor_attendance', title: 'Reports to work on time consistently', description: 'Pumapasok sa trabaho nang tama sa oras' }
    ]
  },
  { 
    id: 'criterion_2',
    type: 'criterion',
    title: 'Dedication to Work (Dedikasyon sa Trabaho)',
    items: [
      { id: 'factor_dedication', title: 'Uses working hours efficiently and productively', description: 'Mahusay na pagamit ng oras ng trabaho' }
    ]
  },
  { 
    id: 'criterion_3',
    type: 'criterion',
    title: 'Performance (Pagganap sa Trabaho)',
    items: [
      { id: 'factor_job_knowledge', title: 'a. Demonstrates strong understanding of assigned tasks and responsibilities', description: 'Mahusay na kaalaman ng kanyang trabaho; alam kung ano at paano gagawin ang mga gawain' },
      { id: 'factor_efficiency', title: 'b. Works efficiently, neatly, and professionally', description: 'Pagtatrabaho nang may kaayusan at bilis habang nananatiling propesyonal' }
    ]
  },
  {
    id: 'criterion_4',
    type: 'criterion',
    title: 'Cooperation (Kooperasyon)',
    items: [
      { id: 'factor_task_acceptance', title: 'a. Willingly accepts assigned duties and tasks', description: 'Maluwag na pagtanggap ng mga trabaho' },
      { id: 'factor_adaptability', title: 'b. Adjusts to new or changed assignments even if not directly related to current role', description: 'Maluwag na pagtanggap ng pagbabago sa mga gawain kahit hindi direktang may relasyon sa trabaho' }
    ]
  },
  {
    id: 'criterion_5',
    type: 'criterion',
    title: 'Initiative (Inisyatiba)',
    items: [
      { id: 'factor_autonomy', title: 'a. Completes work with little or no supervision', description: 'Gumagawa ng trabaho nang halos walang kinakailangang pagsubaybay' },
      { id: 'factor_pressure', title: 'b. Performs well and stays reliable even under pressure', description: 'Gumagawa ng trabaho ng mahusay kahit nasa ilalim ng pressure' }
    ]
  },
  {
    id: 'criterion_6',
    type: 'criterion',
    title: 'Communication (Komunikasyon)',
    items: [
      { id: 'factor_communication', title: 'Communicates clearly and knowledgeably, whether in person or via phone', description: 'Pakikipagusap nang klaro at may kaalaman sa kausap maging personal man o sa telepono' }
    ]
  },
  {
    id: 'criterion_7',
    type: 'criterion',
    title: 'Teamwork (Pakikipagtulungan)',
    items: [
      { id: 'factor_teamwork', title: 'Works well with colleagues and contributes positively to the team', description: 'May kakayahan magtrabaho kasama ang mga katrabaho nang walang gulo' }
    ]
  },
  {
    id: 'criterion_8',
    type: 'criterion',
    title: 'Character (Pag-uugali)',
    items: [
      { id: 'factor_character', title: 'Accepts constructive criticism without negative reactions or defensiveness', description: 'Pagtanggap ng pagpuna nang walang masamang reaksyon o sagot' }
    ]
  },
  {
    id: 'criterion_9',
    type: 'criterion',
    title: 'Responsiveness (Pagtugon sa Sitwasyon)',
    items: [
      { id: 'factor_responsiveness', title: 'Handles challenging or sensitive situations with understanding and professionalism', description: 'Pagganap at paghawak ng mga nakababahalang sitwasyon nang may sensitivity' }
    ]
  },
  {
    id: 'criterion_10',
    type: 'criterion',
    title: 'Personality (Personalidad)',
    items: [
      { id: 'factor_personality', title: 'Displays a pleasant and calm demeanor when dealing with others', description: 'Nagpapakita ng kaaya-aya at kalmadong personalidad kapag nakikitungo sa mga customer at kapwa empleyado' }
    ]
  },
  {
    id: 'criterion_11',
    type: 'criterion',
    title: 'Appearance (Angkop na Pananamit at Kaayusan)',
    items: [
      { id: 'factor_appearance', title: 'Maintains a neat, clean, and appropriate appearance for work', description: 'Maayos ang gayak, malinis, at nakasuot ng angkop para sa trabaho' }
    ]
  },
  {
    id: 'criterion_12',
    type: 'criterion',
    title: 'Work Habits (Gawi sa Trabaho)',
    items: [
      { id: 'factor_work_habits', title: 'Keeps the workstation clean, organized, and orderly', description: 'Pinapanatiling malinis at maayos ang lugar ng trabaho' }
    ]
  },
  
  // --- Textarea Sections ---
  { 
    id: 'factor_evaluator_summary', 
    type: 'textarea', 
    title: "Evaluator's Overall Summary (Kabuohang komento ng Tagasuri)", 
    description: "Provide a holistic summary of the employee's performance, considering all the factors above." 
  },
  { 
    id: 'factor_development_areas', 
    type: 'textarea', 
    title: "Key Strengths & Development Areas (Magandang Aspeto at Mga Dapat Paunlarin)", 
    description: "Identify 1-2 key strengths that should be recognized and 1-2 areas where the employee can focus on development."
  }
];
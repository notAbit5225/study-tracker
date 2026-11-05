export const SUBJECTS = [
  { id: 'maths', label: 'Maths' },
  { id: 'english', label: 'English' },
  { id: 'georgian', label: 'Georgian' },
];

export const subjectLabel = (id) => SUBJECTS.find((s) => s.id === id)?.label ?? id;

// LocalStorage utility functions for data persistence

export interface Project {
  id: string;
  title: string;
  description: string;
  required_skills: string[];
  deadline?: string;
  status: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: string;
  assigned_to?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  project_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'freelancer' | 'project_owner';
  skills?: string[];
  portfolio_url?: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  joined_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  project_id: string;
  freelancer_id: string;
  amount: number;
  status: string;
  payment_date?: string;
  created_at: string;
}

export interface FileAttachment {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  uploaded_by: string;
  task_id?: string;
  created_at: string;
}

const generateId = () => crypto.randomUUID();

// Current user management
export const getCurrentUser = (): Profile | null => {
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
};

export const setCurrentUser = (user: Profile | null) => {
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
};

// Generic CRUD operations
const getItems = <T>(key: string): T[] => {
  const items = localStorage.getItem(key);
  return items ? JSON.parse(items) : [];
};

const setItems = <T>(key: string, items: T[]) => {
  localStorage.setItem(key, JSON.stringify(items));
};

// Projects
export const getProjects = (): Project[] => getItems<Project>('projects');

export const createProject = (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Project => {
  const projects = getProjects();
  const newProject: Project = {
    ...project,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  projects.push(newProject);
  setItems('projects', projects);
  return newProject;
};

export const updateProject = (id: string, updates: Partial<Project>): Project | null => {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  projects[index] = {
    ...projects[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  setItems('projects', projects);
  return projects[index];
};

// Tasks
export const getTasks = (): Task[] => getItems<Task>('tasks');

export const createTask = (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Task => {
  const tasks = getTasks();
  const newTask: Task = {
    ...task,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  tasks.push(newTask);
  setItems('tasks', tasks);
  return newTask;
};

export const updateTask = (id: string, updates: Partial<Task>): Task | null => {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return null;
  
  tasks[index] = {
    ...tasks[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  setItems('tasks', tasks);
  return tasks[index];
};

// Messages
export const getMessages = (): Message[] => getItems<Message>('messages');

export const createMessage = (message: Omit<Message, 'id' | 'created_at'>): Message => {
  const messages = getMessages();
  const newMessage: Message = {
    ...message,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  messages.push(newMessage);
  setItems('messages', messages);
  return newMessage;
};

// Profiles
export const getProfiles = (): Profile[] => getItems<Profile>('profiles');

export const createProfile = (profile: Omit<Profile, 'id'>): Profile => {
  const profiles = getProfiles();
  const newProfile: Profile = {
    ...profile,
    id: generateId(),
  };
  profiles.push(newProfile);
  setItems('profiles', profiles);
  return newProfile;
};

// Project Members
export const getProjectMembers = (): ProjectMember[] => getItems<ProjectMember>('projectMembers');

export const addProjectMember = (member: Omit<ProjectMember, 'id' | 'joined_at'>): ProjectMember => {
  const members = getProjectMembers();
  const newMember: ProjectMember = {
    ...member,
    id: generateId(),
    joined_at: new Date().toISOString(),
  };
  members.push(newMember);
  setItems('projectMembers', members);
  return newMember;
};

export const removeProjectMember = (projectId: string, userId: string) => {
  const members = getProjectMembers();
  const filtered = members.filter(m => !(m.project_id === projectId && m.user_id === userId));
  setItems('projectMembers', filtered);
};

// Milestones
export const getMilestones = (): Milestone[] => getItems<Milestone>('milestones');

export const createMilestone = (milestone: Omit<Milestone, 'id' | 'created_at' | 'updated_at'>): Milestone => {
  const milestones = getMilestones();
  const newMilestone: Milestone = {
    ...milestone,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  milestones.push(newMilestone);
  setItems('milestones', milestones);
  return newMilestone;
};

export const updateMilestone = (id: string, updates: Partial<Milestone>): Milestone | null => {
  const milestones = getMilestones();
  const index = milestones.findIndex(m => m.id === id);
  if (index === -1) return null;
  
  milestones[index] = {
    ...milestones[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  setItems('milestones', milestones);
  return milestones[index];
};

// Payments
export const getPayments = (): Payment[] => getItems<Payment>('payments');

export const createPayment = (payment: Omit<Payment, 'id' | 'created_at'>): Payment => {
  const payments = getPayments();
  const newPayment: Payment = {
    ...payment,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  payments.push(newPayment);
  setItems('payments', payments);
  return newPayment;
};

export const updatePayment = (id: string, updates: Partial<Payment>): Payment | null => {
  const payments = getPayments();
  const index = payments.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  payments[index] = {
    ...payments[index],
    ...updates,
  };
  setItems('payments', payments);
  return payments[index];
};

// File Attachments
export const getFileAttachments = (): FileAttachment[] => getItems<FileAttachment>('fileAttachments');

export const createFileAttachment = (file: Omit<FileAttachment, 'id' | 'created_at'>): FileAttachment => {
  const files = getFileAttachments();
  const newFile: FileAttachment = {
    ...file,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  files.push(newFile);
  setItems('fileAttachments', files);
  return newFile;
};

import React, { useState, useEffect } from 'react';
import { Button, TextField, Checkbox, Chip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

const TaskManagementApp = () => {
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Load sample data
  useEffect(() => {
    const sampleTasks = [
      { id: 1, title: 'Finish project proposal', description: 'Complete the Q3 project proposal document', completed: false, category: 'Work' },
      { id: 2, title: 'Buy groceries', description: 'Milk, eggs, bread, and vegetables', completed: true, category: 'Personal' },
      { id: 3, title: 'Schedule team meeting', description: 'Set up weekly sync with design team', completed: false, category: 'Work' },
      { id: 4, title: 'Pay utility bills', description: 'Electric and water bills due this week', completed: false, category: 'Personal' },
    ];
    setTasks(sampleTasks);
  }, []);

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      const newTask = {
        id: Date.now(),
        title: newTaskTitle,
        description: newTaskDescription,
        completed: false,
        category: newTaskCategory,
      };

      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskCategory('');
      setOpenTaskDialog(false);
    }
  };

  const handleUpdateTask = () => {
    if (editingTask && newTaskTitle.trim()) {
      const updatedTasks = tasks.map(task =>
        task.id === editingTask.id
          ? {
              ...task,
              title: newTaskTitle,
              description: newTaskDescription,
              category: newTaskCategory
            }
          : task
      );

      setTasks(updatedTasks);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskCategory('');
      setEditingTask(null);
      setOpenTaskDialog(false);
    }
  };

  const handleToggleComplete = (taskId) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
  };

  const handleDeleteTask = (taskId) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    setTasks(updatedTasks);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setNewTaskTitle(task.title);
    setNewTaskDescription(task.description);
    setNewTaskCategory(task.category || '');
    setOpenTaskDialog(true);
  };

  const handleOpenTaskDialog = () => {
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskCategory('');
    setEditingTask(null);
    setOpenTaskDialog(true);
  };

  const handleCloseTaskDialog = () => {
    setOpenTaskDialog(false);
  };

  // Filter and search tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        task.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' ||
                        (filterStatus === 'completed' && task.completed) ||
                        (filterStatus === 'active' && !task.completed);

    const matchesCategory = !filterCategory || task.category === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Get unique categories
  const categories = [...new Set(tasks.map(task => task.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Task Manager</h1>
          <p className="text-gray-600">Organize your tasks efficiently</p>
        </header>

        {/* Search and Filter Controls */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField
            label="Search tasks"
            variant="outlined"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
          />

          <div>
            <select
              className="w-full p-2 border border-gray-300 rounded"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Tasks</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <select
              className="w-full p-2 border border-gray-300 rounded"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Task List */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Your Tasks ({filteredTasks.length})
            </h2>
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenTaskDialog}
            >
              Add Task
            </Button>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tasks found. Create a new task to get started!
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredTasks.map(task => (
                <li key={task.id} className={`border rounded-md p-4 ${task.completed ? 'bg-gray-50' : 'bg-white'}`}>
                  <div className="flex items-start">
                    <Checkbox
                      checked={task.completed}
                      onChange={() => handleToggleComplete(task.id)}
                      className="mt-1"
                    />
                    <div className="ml-2 flex-grow">
                      <div className="flex justify-between">
                        <h3 className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                          {task.title}
                        </h3>
                        <div>
                          <Button
                            size="small"
                            onClick={() => handleEditTask(task)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mt-1">{task.description}</p>
                      {task.category && (
                        <Chip
                          label={task.category}
                          size="small"
                          className="mt-2"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Task Creation/Edit Dialog */}
        <Dialog open={openTaskDialog} onClose={handleCloseTaskDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogContent>
            <div className="space-y-4 mt-2">
              <TextField
                label="Task Title"
                variant="outlined"
                fullWidth
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
              />
              <TextField
                label="Description"
                variant="outlined"
                fullWidth
                multiline
                rows={3}
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
              />
              <TextField
                label="Category"
                variant="outlined"
                fullWidth
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value)}
                placeholder="e.g. Work, Personal, Study"
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseTaskDialog}>Cancel</Button>
            <Button
              onClick={editingTask ? handleUpdateTask : handleAddTask}
              variant="contained"
              color="primary"
              disabled={!newTaskTitle.trim()}
            >
              {editingTask ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Statistics */}
        <div className="border-t pt-4 mt-8">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-700">Total Tasks</p>
              <p className="text-2xl font-bold text-blue-800">{tasks.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm text-green-700">Completed</p>
              <p className="text-2xl font-bold text-green-800">
                {tasks.filter(task => task.completed).length}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <p className="text-sm text-yellow-700">Pending</p>
              <p className="text-2xl font-bold text-yellow-800">
                {tasks.filter(task => !task.completed).length}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-sm text-purple-700">Categories</p>
              <p className="text-2xl font-bold text-purple-800">{categories.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskManagementApp;

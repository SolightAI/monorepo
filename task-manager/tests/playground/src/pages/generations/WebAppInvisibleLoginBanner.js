import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  TextField,
  Chip,
  Box,
  Paper
} from '@mui/material';
import AuthBanner from '../../components/AuthBanner';

const WebAppInvisibleLoginBanner = () => {
  // State for project dialog
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [projects, setProjects] = useState([
    { id: 1, name: "Website Redesign", deadline: "Next Monday", tasks: 5 },
    { id: 2, name: "Mobile App Development", deadline: "In 2 weeks", tasks: 8 },
    { id: 3, name: "Marketing Campaign", deadline: "This Friday", tasks: 3 }
  ]);

  // State for tasks dialog
  const [tasksOpen, setTasksOpen] = useState(false);
  const [tasks, setTasks] = useState([
    { id: 1, title: "Update homepage design", completed: false, project: "Website Redesign" },
    { id: 2, title: "Fix navigation responsiveness", completed: true, project: "Website Redesign" },
    { id: 3, title: "Create API documentation", completed: false, project: "Mobile App Development" },
    { id: 4, title: "Design social media assets", completed: false, project: "Marketing Campaign" },
    { id: 5, title: "Write blog post content", completed: true, project: "Marketing Campaign" }
  ]);

  // State for statistics dialog
  const [statsOpen, setStatsOpen] = useState(false);
  const [newTask, setNewTask] = useState("");

  // Toggle task completion
  const toggleTask = (id) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  // Add new task
  const addTask = () => {
    if (newTask.trim()) {
      const newTaskObj = {
        id: tasks.length + 1,
        title: newTask,
        completed: false,
        project: "Website Redesign"
      };
      setTasks([...tasks, newTaskObj]);
      setNewTask("");
    }
  };

  useEffect(() => {
    // Check login status from localStorage
    const loginStatus = localStorage.getItem('isLoggedIn') === 'true';
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* The banner is included in the markup but not visible */}
        <AuthBanner isVisible={false} />

        <header className="text-center mb-8">
          <Typography variant="h4" component="h1" gutterBottom>
            Task Dashboard
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Manage your projects and tasks efficiently
          </Typography>
        </header>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Projects
                </Typography>
                <Typography variant="body2" paragraph>
                  You have {projects.length} active projects that need attention this week.
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={() => setProjectsOpen(true)}
                >
                  View Projects
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Tasks
                </Typography>
                <Typography variant="body2" paragraph>
                  {tasks.filter(t => t.completed).length} of {tasks.length} tasks completed.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => setTasksOpen(true)}
                >
                  View Tasks
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card variant="outlined" className="mt-4">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Weekly Overview
                </Typography>
                <Typography variant="body2" paragraph>
                  Your productivity has increased by 12% compared to last week. Keep up the good work!
                </Typography>
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  onClick={() => setStatsOpen(true)}
                >
                  View Statistics
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Projects Dialog */}
        <Dialog open={projectsOpen} onClose={() => setProjectsOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Active Projects</DialogTitle>
          <DialogContent>
            <List>
              {projects.map(project => (
                <ListItem key={project.id} divider>
                  <ListItemText
                    primary={project.name}
                    secondary={`Due: ${project.deadline} | Tasks: ${project.tasks}`}
                  />
                  <Chip label={`${project.tasks} tasks`} color="primary" size="small" />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProjectsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Tasks Dialog */}
        <Dialog open={tasksOpen} onClose={() => setTasksOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Task Management</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', my: 2 }}>
              <TextField
                label="New Task"
                variant="outlined"
                size="small"
                fullWidth
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
              />
              <Button
                variant="contained"
                color="primary"
                sx={{ ml: 1 }}
                onClick={addTask}
              >
                Add
              </Button>
            </Box>

            <List>
              {tasks.map(task => (
                <ListItem key={task.id} divider button onClick={() => toggleTask(task.id)}>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={task.completed}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={task.title}
                    secondary={task.project}
                    style={{ textDecoration: task.completed ? 'line-through' : 'none' }}
                  />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTasksOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Statistics Dialog */}
        <Dialog open={statsOpen} onClose={() => setStatsOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Weekly Statistics</DialogTitle>
          <DialogContent>
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
              <Typography variant="h6" gutterBottom>Performance Overview</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="overline">Tasks Completed</Typography>
                  <Typography variant="h5">{tasks.filter(t => t.completed).length}/{tasks.length}</Typography>
                </Box>
                <Box>
                  <Typography variant="overline">Completion Rate</Typography>
                  <Typography variant="h5">
                    {Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)}%
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="overline">Active Projects</Typography>
                  <Typography variant="h5">{projects.length}</Typography>
                </Box>
              </Box>
            </Paper>
            <Typography variant="body1" paragraph>
              Your productivity is trending upward! You've completed more tasks this week than last week.
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Tip: Focus on completing the "Marketing Campaign" tasks as they're due this Friday.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStatsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default WebAppInvisibleLoginBanner;

import 'package:flutter/material.dart';

void main() {
  runApp(TaskApp());
}

class TaskApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TaskMap',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: TaskScreen(),
    );
  }
}

class TaskScreen extends StatefulWidget {
  @override
  _TaskScreenState createState() => _TaskScreenState();
}

class _TaskScreenState extends State<TaskScreen> {
  final List<Task> _tasks = [];
  final TextEditingController _taskController = TextEditingController();
  final TextEditingController _locationController = TextEditingController();
  int _taskIdCounter = 0; // Counter for generating unique IDs.
  Task? _lastDeletedTask;
  int? _lastDeletedTaskIndex;

  void _addTask(String title, String location) {
    if (title.isNotEmpty) {
      setState(() {
        _tasks.add(Task(
          id: _taskIdCounter++,
          title: title,
          location: location,
        ));
      });
      _taskController.clear();
      _locationController.clear();
    }
  }

  void _deleteTask(int index) {
    setState(() {
      _lastDeletedTask = _tasks.removeAt(index);
      _lastDeletedTaskIndex = index;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Task "${_lastDeletedTask?.title}" deleted'),
        action: SnackBarAction(
          label: 'Undo',
          onPressed: _undoDelete,
        ),
        duration: const Duration(seconds: 5),
      ),
    );
  }

  void _undoDelete() {
    if (_lastDeletedTask != null && _lastDeletedTaskIndex != null) {
      setState(() {
        _tasks.insert(_lastDeletedTaskIndex!, _lastDeletedTask!);
        _lastDeletedTask = null;
        _lastDeletedTaskIndex = null;
      });
    }
  }

  void _toggleTask(Task task) {
    setState(() {
      task.isDone = !task.isDone;
    });
  }

  void _reorderTasks(int oldIndex, int newIndex) {
    setState(() {
      if (newIndex > oldIndex) newIndex--;
      final task = _tasks.removeAt(oldIndex);
      _tasks.insert(newIndex, task);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('TaskMap'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _taskController,
                    decoration: const InputDecoration(
                      labelText: 'Task Name',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _locationController,
                    decoration: const InputDecoration(
                      labelText: 'Location',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () => _addTask(
                    _taskController.text,
                    _locationController.text,
                  ),
                  child: const Text('Add'),
                ),
              ],
            ),
          ),
          Expanded(
            child: ReorderableListView(
              onReorder: _reorderTasks,
              children: _tasks
                  .asMap()
                  .entries
                  .map((entry) {
                    final task = entry.value;
                    final index = entry.key;

                    return Dismissible(
                      key: ValueKey(task.id),
                      direction: DismissDirection.endToStart,
                      onDismissed: (_) => _deleteTask(index),
                      background: Container(
                        alignment: Alignment.centerRight,
                        color: Colors.red,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: const Icon(
                          Icons.delete,
                          color: Colors.white,
                        ),
                      ),
                      child: Card(
                        margin: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        child: ListTile(
                          leading: Checkbox(
                            value: task.isDone,
                            onChanged: (_) => _toggleTask(task),
                          ),
                          title: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                task.title,
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  decoration: task.isDone
                                      ? TextDecoration.lineThrough
                                      : TextDecoration.none,
                                ),
                              ),
                              if (task.location.isNotEmpty)
                                Text(
                                  'Location: ${task.location}',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.grey[600],
                                  ),
                                ),
                            ],
                          ),
                          trailing: ReorderableDragStartListener(
                            index: index,
                            child: const Icon(Icons.drag_handle),
                          ),
                        ),
                      ),
                    );
                  })
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class Task {
  final int id; // Unique ID for each task.
  final String title;
  final String location;
  bool isDone;

  Task({
    required this.id,
    required this.title,
    this.location = '',
    this.isDone = false,
  });
}

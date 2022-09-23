const selectors = {
  getInput() {
    return document.querySelector(".item-input") as HTMLInputElement;
  },
  getAddButton() {
    return document.querySelector(".add-btn");
  },
  getClearButton() {
    return document.querySelector(".clear-btn");
  },
  getFilterCheckBoxes() {
    return document.querySelectorAll(".filter-checkbox");
  },
  getUnsortedList() {
    return document.querySelector(".items-list");
  },
  getAlert() {
    return document.querySelector(".alert");
  },
};

type TaskState = {
  completed?: boolean;
  taskName: string;
  id: number | string;
};

type UIState = {
  tasks: TaskState[];
};

type PubSub = {
  subscribe: Function;
  unsubscribe: Function;
  publish: Function;
};

enum ActionType {
  INITIAL_MOUNT = "initial mount",
  ADD_TASK = "add task",
  DELETE_TASK = "delete task",
  UPDATE_TASK = "update task",
  TOGGLE_COMPLETED = "toggle completed",
}

const INITIAL_STATE: UIState = {
  tasks: [],
};

function PubSub() {
  const subscribers: { [key: string]: Array<Function> } = {};

  function subscribe(event: string, callbacks: Function[]) {
    if (!subscribers[event]) {
      subscribers[event] = [];
    }
    subscribers[event] = [...subscribers[event], ...callbacks];
  }

  function unsubscribe(event: string, callback: Function) {
    subscribers[event] = subscribers[event].filter((cb: Function) => {
      return cb !== callback;
    });
  }

  function publish(event: string, state: UIState) {
    if (!subscribers[event]) {
      return;
    }
    subscribers[event].forEach((callback) => {
      callback(state);
    });
  }

  return {
    subscribe,
    unsubscribe,
    publish,
  };
}

const getFilteredTasks = ({
  filter,
  state,
  filterCheckBoxClicked,
}: {
  filter: string;
  state: UIState;
  filterCheckBoxClicked?: boolean;
}) => {
  return state.tasks.filter((task) => {
    if (filterCheckBoxClicked) {
      if (filter === "completed-tasks") {
        return task.completed === true;
      } else if (filter === "not-completed-tasks") {
        return task.completed === false;
      } else {
        return state.tasks;
      }
    } else {
      return filter
        ? !task.taskName.toLocaleLowerCase().includes(filter.toLowerCase())
        : state.tasks;
    }
  });
};

const insertTask = (tasks: TaskState[], value: string) => {
  const newTasks = [...tasks, { completed: false, taskName: value, id: value }];
  return newTasks;
};

const updateTaskValue = (
  origToDo: string,
  state: UIState,
  updatedToDo?: string,
  completedStatus?: boolean
) => {
  return state.tasks.map((task) => {
    if (task.taskName === origToDo) {
      if (updatedToDo) {
        return {
          ...task,
          taskName: updatedToDo,
          id: updatedToDo,
          completed: completedStatus,
        };
      } else {
        return {
          ...task,
          taskName: origToDo,
          id: origToDo,
          completed: completedStatus,
        };
      }
    } else return task;
  });
};

function Store(pubSub: PubSub) {
  let state: UIState = INITIAL_STATE;

  function initialMount() {
    state = {
      ...INITIAL_STATE,
      tasks: [],
    };

    pubSub.publish(ActionType.INITIAL_MOUNT, state);
  }

  function addTask(value: string) {
    state = {
      ...state,
      tasks: insertTask(state.tasks, value),
    };

    pubSub.publish(ActionType.ADD_TASK, state);
  }

  function filterTasks(filter: string, filterCheckBoxClicked: boolean) {
    if (filterCheckBoxClicked) {
      let tempState = state;
      tempState = {
        ...tempState,
        tasks: getFilteredTasks({ filter, state, filterCheckBoxClicked }),
      };
      pubSub.publish(ActionType.DELETE_TASK, tempState);
    } else {
      state = {
        ...state,
        tasks: getFilteredTasks({ filter, state, filterCheckBoxClicked }),
      };
      pubSub.publish(ActionType.DELETE_TASK, state);
    }
  }

  function updateTaskState(
    origToDo: string,
    completeStatus?: boolean,
    updatedToDo?: string
  ) {
    state = {
      ...state,
      tasks: updateTaskValue(origToDo, state, updatedToDo, completeStatus),
    };
    pubSub.publish(ActionType.UPDATE_TASK, state);
  }

  function getState() {
    return state;
  }

  return {
    initialMount,
    addTask,
    filterTasks,
    getState,
    updateTaskState,
  };
}

function Renderer() {
  const ul = selectors.getUnsortedList();
  function renderItems(state: UIState) {
    if (ul.firstChild) {
      removeItems();
    }
    if (state.tasks.length > 0) {
      state.tasks.forEach((task) => {
        const li = document.createElement("li");

        li.classList.add("item");

        const input = document.createElement("input");
        input.type = "checkbox";
        input.classList.add("to-do-checkbox");
        if (task.completed) {
          input.checked = true;
        }

        const span = document.createElement("span");
        span.innerText = task.taskName;
        span.id = task.taskName;
        span.classList.add("to-do");
        if (task.completed) {
          span.classList.add("task-completed");
        }

        const delButton = document.createElement("button");
        delButton.classList.add("delete-btn");
        delButton.innerText = "delete";

        const saveButton = document.createElement("button");
        saveButton.classList.add("save-btn");
        saveButton.classList.add("hidden-btn");
        saveButton.innerText = "save";

        li.append(input, span, delButton, saveButton);

        ul.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.innerText = "No tasks";
      li.classList.add("empty-to-do");
      ul.appendChild(li);
    }
  }

  function removeItems() {
    while (ul.firstChild) {
      ul.firstChild.remove();
    }
  }

  return {
    renderItems,
    removeItems,
  };
}

function runMain() {
  const pubSub = PubSub();
  const store = Store(pubSub);
  const renderer = Renderer();

  /** Set up subscriptions */
  pubSub.subscribe(ActionType.INITIAL_MOUNT, [
    renderer.removeItems,
    renderer.renderItems,
  ]);
  pubSub.subscribe(ActionType.ADD_TASK, [renderer.renderItems]);
  pubSub.subscribe(ActionType.DELETE_TASK, [renderer.renderItems]);
  pubSub.subscribe(ActionType.UPDATE_TASK, [renderer.renderItems]);
  pubSub.subscribe(ActionType.TOGGLE_COMPLETED, [renderer.renderItems]);

  /** Clean up all references in memory */
  selectors.getUnsortedList().addEventListener("unload", function () {
    pubSub.unsubscribe(ActionType.INITIAL_MOUNT, renderer.renderItems);
    pubSub.unsubscribe(ActionType.ADD_TASK, renderer.renderItems);
    pubSub.unsubscribe(ActionType.UPDATE_TASK, renderer.renderItems);
    pubSub.unsubscribe(ActionType.TOGGLE_COMPLETED, renderer.renderItems);
  });

  store.initialMount();

  function toggleAlert(text: string, action: string) {
    const alert = selectors.getAlert();
    alert.textContent = text;
    alert.classList.add(`alert-${action}`);

    setTimeout(() => {
      alert.textContent = "";
      alert.classList.remove(`alert-${action}`);
    }, 500);
  }

  /* Event listeners */
  selectors.getAddButton().addEventListener("click", function (e) {
    e.preventDefault();
    const val = selectors.getInput().value;

    if (store.getState().tasks.some((todo) => todo.taskName === val)) {
      toggleAlert("To-Do already present. Please try again", "danger");
      selectors.getInput().value = "";
    } else {
      if (val) {
        store.addTask(val);
        selectors.getInput().value = "";
        toggleAlert("To-Do has been added", "success");
      } else {
        toggleAlert("To-Do cannot be empty. Please try again", "danger");
      }
    }
  });

  selectors.getClearButton().addEventListener("click", function () {
    store.initialMount();
  });

  function addEventListener(
    eventName: string,
    selector: string,
    callback: Function
  ) {
    let handler = (e: Event) => {
      if ((e.target as Element).matches(selector)) {
        callback(e);
      }
    };
    selectors.getUnsortedList().addEventListener(eventName, handler);
  }

  addEventListener(
    "click",
    ".delete-btn, .save-btn, .to-do,.to-do-checkbox",
    (e: Event) => {
      const target = e.target as Element;
      const className = target.classList.toString();
      const parent = target.parentElement;
      const spanToDo = parent.querySelector("span");
      const valueToDo = spanToDo.innerText;
      const origToDo = spanToDo.id.toString();
      const deleteBtn = parent.querySelector(".delete-btn");
      const saveBtn = parent.querySelector(".save-btn");
      const checkBox = parent.querySelector(
        ".to-do-checkbox"
      ) as HTMLInputElement;

      if (className === "delete-btn") {
        store.filterTasks(valueToDo, false);
        toggleAlert("To-Do has been deleted", "danger");
        return;
      }

      if (className === "to-do") {
        deleteBtn.classList.add("hidden-btn");
        saveBtn.classList.remove("hidden-btn");
        saveBtn.classList.add("show-btn");
        checkBox.toggleAttribute("disabled");
        spanToDo.classList.toggle("edit-to-do");
        spanToDo.contentEditable = "true";
        spanToDo.focus();

        return;
      }

      if (className === "to-do-checkbox") {
        spanToDo.classList.toggle("task-completed");
        const toDoValue = spanToDo.textContent;
        if (checkBox.checked) {
          store.updateTaskState(toDoValue, true);
        } else {
          store.updateTaskState(toDoValue, false);
        }
      }

      if (className.includes("save-btn")) {
        saveBtn.classList.remove("show-btn");
        saveBtn.classList.add("hidden-btn");
        deleteBtn.classList.remove("hidden-btn");
        checkBox.toggleAttribute("disabled");
        spanToDo.classList.toggle("edit-to-do");
        const updatedToDo = spanToDo.innerText;

        store.updateTaskState(origToDo, false, updatedToDo);
        return;
      }
    }
  );

  function toggleFilterCheckBoxes(e: Event) {
    const id = (e.target as HTMLInputElement).name;
    selectors.getFilterCheckBoxes().forEach((box: HTMLInputElement) => {
      if (id === box.name) {
        store.filterTasks(box.name, true);
        box.checked = true;
      } else {
        box.checked = false;
      }
    });
  }

  selectors.getFilterCheckBoxes().forEach((box) => {
    box.addEventListener("click", toggleFilterCheckBoxes);
  });
}

runMain();

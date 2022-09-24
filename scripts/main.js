const selectors = {
    getInput() {
        return document.querySelector(".item-input");
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
    getToDoCount() {
        return document.getElementById("todo-total-count");
    },
    getCompletedCount() {
        return document.getElementById("completed-todo-count");
    },
    getNotCompletedCount() {
        return document.getElementById("not-completed-todo-count");
    },
};
var ActionType;
(function (ActionType) {
    ActionType["INITIAL_MOUNT"] = "initial mount";
    ActionType["ADD_TASK"] = "add task";
    ActionType["FILTER_TASK"] = "delete task";
    ActionType["UPDATE_TASK"] = "update task";
    ActionType["TOGGLE_COMPLETED"] = "toggle completed";
    ActionType["UPDATE_STATS"] = "update stats";
})(ActionType || (ActionType = {}));
const INITIAL_STATE = {
    tasks: [],
    totalTasks: 0,
    totalCompleted: 0,
    totalNotCompleted: 0,
    totalCompletedPercent: 0,
    totalNotCompletedPercent: 0,
};
function PubSub() {
    const subscribers = {};
    function subscribe(event, callbacks) {
        if (!subscribers[event]) {
            subscribers[event] = [];
        }
        subscribers[event] = [...subscribers[event], ...callbacks];
    }
    function unsubscribe(event, callback) {
        subscribers[event] = subscribers[event].filter((cb) => {
            return cb !== callback;
        });
    }
    function publish(event, state) {
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
const getFilteredTasks = ({ filter, state, filterCheckBoxClicked, }) => {
    return state.tasks.filter((task) => {
        if (filterCheckBoxClicked) {
            if (filter === "completed-tasks") {
                return task.completed === true;
            }
            else if (filter === "not-completed-tasks") {
                return task.completed === false;
            }
            else {
                return state.tasks;
            }
        }
        else {
            return filter
                ? !task.taskName.toLocaleLowerCase().includes(filter.toLowerCase())
                : state.tasks;
        }
    });
};
const insertTask = (tasks, value) => {
    const newTasks = [...tasks, { completed: false, taskName: value, id: value }];
    return newTasks;
};
const updateTaskValue = (origToDo, state, updatedToDo, completedStatus) => {
    return state.tasks.map((task) => {
        if (task.taskName === origToDo) {
            if (updatedToDo) {
                return Object.assign(Object.assign({}, task), { taskName: updatedToDo, id: updatedToDo, completed: completedStatus });
            }
            else {
                return Object.assign(Object.assign({}, task), { taskName: origToDo, id: origToDo, completed: completedStatus });
            }
        }
        else
            return task;
    });
};
function Store(pubSub) {
    let state = INITIAL_STATE;
    function initialMount() {
        state = Object.assign(Object.assign({}, INITIAL_STATE), { tasks: [] });
        pubSub.publish(ActionType.INITIAL_MOUNT, state);
    }
    function addTask(value) {
        state = Object.assign(Object.assign({}, state), { tasks: insertTask(state.tasks, value) });
        pubSub.publish(ActionType.ADD_TASK, state);
    }
    function filterTasks(filter, filterCheckBoxClicked) {
        if (filterCheckBoxClicked) {
            let tempState = state;
            tempState = Object.assign(Object.assign({}, tempState), { tasks: getFilteredTasks({ filter, state, filterCheckBoxClicked }) });
            pubSub.publish(ActionType.FILTER_TASK, tempState);
        }
        else {
            state = Object.assign(Object.assign({}, state), { tasks: getFilteredTasks({ filter, state, filterCheckBoxClicked }) });
            pubSub.publish(ActionType.FILTER_TASK, state);
        }
    }
    function updateTaskName(origToDo, completeStatus, updatedToDo) {
        state = Object.assign(Object.assign({}, state), { tasks: updateTaskValue(origToDo, state, updatedToDo, completeStatus) });
        pubSub.publish(ActionType.UPDATE_TASK, state);
    }
    function updateStatsState(event, taskStatus) {
        const className = event.target.classList.toString();
        let totalCounter = state.totalTasks;
        let completedCounter = state.totalCompleted;
        let notCompletedCounter = state.totalNotCompleted;
        if (className === "add-btn") {
            totalCounter++;
            notCompletedCounter++;
        }
        else if (className === "delete-btn") {
            totalCounter--;
            if (taskStatus)
                completedCounter--;
            else
                notCompletedCounter--;
        }
        else if (className === "clear-btn")
            totalCounter = 0;
        if (className === "to-do-checkbox") {
            if (event.target.checked) {
                completedCounter++;
                notCompletedCounter--;
            }
            else {
                completedCounter--;
                notCompletedCounter++;
            }
        }
        state = Object.assign(Object.assign({}, state), { totalTasks: totalCounter, totalCompleted: completedCounter, totalNotCompleted: notCompletedCounter, totalCompletedPercent: Math.round((completedCounter / totalCounter) * 100), totalNotCompletedPercent: Math.round((notCompletedCounter / totalCounter) * 100) });
        pubSub.publish(ActionType.UPDATE_STATS, state);
    }
    function getState() {
        return state;
    }
    return {
        initialMount,
        addTask,
        filterTasks,
        getState,
        updateTaskName,
        updateStatsState,
    };
}
function Renderer() {
    const ul = selectors.getUnsortedList();
    function renderItems(state) {
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
        }
        else {
            const li = document.createElement("li");
            li.innerText = "No tasks";
            li.classList.add("empty-to-do");
            ul.appendChild(li);
        }
    }
    function renderTotal(state) {
        selectors.getToDoCount().innerText = state.totalTasks.toString();
        selectors.getCompletedCount().innerText =
            state.totalCompletedPercent.toString();
        selectors.getNotCompletedCount().innerText =
            state.totalNotCompletedPercent.toString();
    }
    function removeItems() {
        while (ul.firstChild) {
            ul.firstChild.remove();
        }
    }
    return {
        renderItems,
        removeItems,
        renderTotal,
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
    pubSub.subscribe(ActionType.FILTER_TASK, [renderer.renderItems]);
    pubSub.subscribe(ActionType.UPDATE_TASK, [renderer.renderItems]);
    pubSub.subscribe(ActionType.TOGGLE_COMPLETED, [renderer.renderItems]);
    pubSub.subscribe(ActionType.UPDATE_STATS, [renderer.renderTotal]);
    /** Clean up all references in memory */
    selectors.getUnsortedList().addEventListener("unload", function () {
        pubSub.unsubscribe(ActionType.INITIAL_MOUNT, renderer.renderItems);
        pubSub.unsubscribe(ActionType.ADD_TASK, renderer.renderItems);
        pubSub.unsubscribe(ActionType.UPDATE_TASK, renderer.renderItems);
        pubSub.unsubscribe(ActionType.TOGGLE_COMPLETED, renderer.renderItems);
        pubSub.unsubscribe(ActionType.UPDATE_STATS, renderer.renderTotal);
    });
    store.initialMount();
    function toggleAlert(text, action) {
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
        }
        else {
            if (val) {
                store.addTask(val);
                selectors.getInput().value = "";
                toggleAlert("To-Do has been added", "success");
                store.updateStatsState(e);
            }
            else {
                toggleAlert("To-Do cannot be empty. Please try again", "danger");
            }
        }
    });
    selectors.getClearButton().addEventListener("click", function (e) {
        store.initialMount();
        store.updateStatsState(e);
    });
    function addEventListener(eventName, selector, callback) {
        let handler = (e) => {
            if (e.target.matches(selector)) {
                callback(e);
            }
        };
        selectors.getUnsortedList().addEventListener(eventName, handler);
    }
    addEventListener("click", ".delete-btn, .save-btn, .to-do,.to-do-checkbox", (e) => {
        const target = e.target;
        const className = target.classList.toString();
        const parent = target.parentElement;
        const spanToDo = parent.querySelector("span");
        const valueToDo = spanToDo.innerText;
        const origToDo = spanToDo.id.toString();
        const deleteBtn = parent.querySelector(".delete-btn");
        const saveBtn = parent.querySelector(".save-btn");
        const checkBox = parent.querySelector(".to-do-checkbox");
        if (className === "delete-btn") {
            store.filterTasks(valueToDo, false);
            toggleAlert("To-Do has been deleted", "danger");
            store.updateStatsState(e, checkBox.checked);
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
            store.updateStatsState(e);
            if (checkBox.checked) {
                store.updateTaskName(toDoValue, true);
            }
            else {
                store.updateTaskName(toDoValue, false);
            }
        }
        if (className.includes("save-btn")) {
            saveBtn.classList.remove("show-btn");
            saveBtn.classList.add("hidden-btn");
            deleteBtn.classList.remove("hidden-btn");
            checkBox.toggleAttribute("disabled");
            spanToDo.classList.toggle("edit-to-do");
            const updatedToDo = spanToDo.innerText;
            store.updateTaskName(origToDo, false, updatedToDo);
            return;
        }
    });
    function toggleFilterCheckBoxes(e) {
        const id = e.target.name;
        selectors.getFilterCheckBoxes().forEach((box) => {
            if (id === box.name) {
                store.filterTasks(box.name, true);
                box.checked = true;
            }
            else {
                box.checked = false;
            }
        });
    }
    selectors.getFilterCheckBoxes().forEach((box) => {
        box.addEventListener("click", toggleFilterCheckBoxes);
    });
}
runMain();
//# sourceMappingURL=main.js.map
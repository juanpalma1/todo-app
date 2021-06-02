'use strict';

const App = function() {
  return {
    init() {
      Templates.init();
      Todos.init();
      UI.init();
    },
  };
}();

const Templates = function() {
  function compileAndRemove(script) {
    Templates.list[script.id] = Handlebars.compile(script.innerHTML);
    script.remove();
  }

  function register(partial) {
    Handlebars.registerPartial(partial.id, partial.innerHTML);
  }

  return {
    init() {
      this.list = {};
      this.cache();
    },

    cache() {
      const scripts = document.querySelectorAll("script[type='text/x-handlebars']");
      const partials = document.querySelectorAll('.partial');
      scripts.forEach(compileAndRemove);
      partials.forEach(register);
    },
  };
}();

const Todos = function() {
  function isNotUnique(newTitle) {
    const id = document.getElementById('id').value;
    const regex = new RegExp(/\s+/, 'g');
    newTitle = newTitle.replace(regex, '');

    const sameTitleTodos = Todos.list.filter(todo => {
      const existingTitle = todo['title'].replace(regex, '');
      return id ?
        existingTitle === newTitle && todo['id'] !== Number(id) :
        existingTitle === newTitle;
    });

    return sameTitleTodos.length === 1;
  }

  return {
    init() {
      this.id = null;
      this.edit = false;
      this.list = [];
      this.blank = {
        title: '',
        day: '',
        month: '',
        year: '',
        completed: false,
        description: '',
      };
    },

    hasValidDate(todo) {
      return todo && !!todo['month'] && !!todo['year'];
    },

    format(todo) {
      todo['year'] = todo['year'].slice(2);
      todo['validDate'] = this.hasValidDate(todo);
      return todo;
    },

    clean(response) {
      return Array.isArray(response) ?
        response.map(this.format.bind(this)) :
        this.format(response);
    },

    getId(element) {
      element = UI.getItem(element);
      const text = element.textContent;
      const [ title ] = text.split('-').map(str => str.trim());
      for (let idx = 0; idx < this.list.length; idx += 1) {
        let todo = this.list[idx];
        let id = todo['id'];
        if (todo['title'] === title) return id;
      }
    },

    lookup(id) {
      for (let idx = 0; idx < this.list.length; idx += 1) {
        let todo = this.list[idx];
        if (todo['id'] === id) return todo;
      }
    },

    toggleCompleted(todo) {
      todo['completed'] = !todo['completed'];
    },

    isCompleted(todo) {
      return todo['completed'];
    },

    isInvalidTitle(title) {
      const regex = new RegExp(/[a-z0-9]/, 'gi');
      return !title ||
        title.length < 3 ||
        !regex.test(title) ||
        title.includes('-') ||
        isNotUnique(title);
    },

    getTodos(group) {
      return Todos.list.filter(todo => {
        const heading = UI.getHeading(group);
        const groupName = UI.getGroupName(group);
        switch (groupName) {
          case 'All Todos':
            return true;
          case 'Completed':
            return Todos.isCompleted(todo);
          case 'No Due Date':
            return heading === 'All Todos' ?
              !this.hasValidDate(todo) :
              !this.hasValidDate(todo) && Todos.isCompleted(todo);
          default:
            const date = group.firstChild.textContent.trim();
            const [ month, year ] = date.split('/');
            return heading === 'All Todos' ?
              todo['month'] === month && todo['year'] === year :
              todo['month'] === month && todo['year'] === year && Todos.isCompleted(todo);
        }
      });
    },

    getGroupName(todo) {
      let { month, year } = todo;
      return Todos.hasValidDate(todo) ?
        `${month}/${year}` :
        'No Due Date';
    },

    createNewGroup(name, todos) {
      return {
        name,
        count: this.getCount(name, todos),
      };
    },

    getGroups(todos) {
      const groups = [];
      todos.forEach(todo => {
        let newName = this.getGroupName(todo);
        let newGroup = this.createNewGroup(newName, todos);
        if (!groups.some(group => group['name'] === newName)) {
          groups.push(newGroup);
        }
      });

      return groups;
    },

    getCount(groupName, todos) {
      let count = 0;
      todos.forEach(todo => {
        switch (groupName) {
          case 'All Todos':
            count += 1;
            break;
          case 'Completed':
            if (Todos.isCompleted(todo)) count += 1;
            break;
          case 'No Due Date':
            if (!Todos.hasValidDate(todo)) count += 1;
            break;
          default:
            let [ groupMonth, groupYear ] = groupName.split('/');
            if (todo['month'] === groupMonth && todo['year'] === groupYear) count += 1;
        }
      });

      return count;
    },
  };
}();

const UI = function() {
  function selectDate(todo) {
    const selects = UI.todoForm.querySelectorAll('select');
    selects.forEach(select => {
      const options = select.querySelectorAll('option');
      const key = select.firstElementChild.textContent.toLowerCase();
      const value = key === 'year' ? `20${todo[key]}` : todo[key];
      if (value) {
        options.forEach(option => {
          if (option['value'] === value) option.selected = 'selected';
        });
      }
    });
  }

  function moveCompletedTodos() {
    const todoNames = UI.todoList.querySelectorAll('p');
    todoNames.forEach(todoName => {
      if (todoName.classList.contains('completed')) {
        UI.todoList.appendChild(todoName.parentElement);
      }
    });
  }

  function moveUndatedGroups() {
    const groupLists = document.querySelectorAll('.groups');
    groupLists.forEach(groupList => {
      for (let idx = 0; idx < groupList.children.length; idx += 1) {
        let group = groupList.children[idx];
        let groupName = UI.getGroupName(group);
        if (groupName === 'No Due Date') {
          groupList.insertAdjacentElement('afterbegin', group);
        }
      }
    });
  }

  return {
    init() {
      this.getElements();
      this.renderPage();
      this.bindEvents();
    },

    getElements() {
      this.mainHeading = document.querySelector('main h2');
      this.todoList = document.getElementById('todo-list');
      this.adder = document.getElementById('adder');
      this.overlay = document.getElementById('overlay');
      this.todoForm = document.getElementById('todo-form');
      this.allGroupList = document.getElementById('all-groups');
      this.completedGroupList = document.getElementById('completed-groups');
      this.nav = document.querySelector('nav');
      this.allCount = document.getElementById('all-count');
      this.completedCount = document.getElementById('completed-count');
      this.selectedCollection = document.getElementsByClassName('selected');
      this.allGroupHeading = document.querySelector('nav h2');
    },

    async renderPage() {
      await API.getTodos();
      this.renderMainHeading();
      this.renderTodos();
      this.renderGroups();
      this.renderForm();
    },

    bindEvents() {
      this.adder.addEventListener('click', Handlers.clickAdder.bind(this));
      this.overlay.addEventListener('click', Handlers.clickOverlay.bind(this));
      this.todoForm.addEventListener('click', Handlers.clickButton.bind(this));
      this.todoForm.addEventListener('submit', Handlers.submit.bind(this));
      this.todoList.addEventListener('click', Handlers.clickTodo.bind(this));
      this.nav.addEventListener('click', Handlers.clickGroup.bind(this));
    },

    renderMainHeading(heading = 'All Todos', count = Todos.list.length) {
      const headingTemplate = Templates.list['heading-template'];
      this.mainHeading.innerHTML = headingTemplate({ heading, count });
    },

    renderTodos(todos = Todos.list) {
      const todosTemplate = Templates.list['todos-template'];
      this.todoList.innerHTML = todosTemplate({ todos });
      if (todos.some(Todos.isCompleted)) {
        moveCompletedTodos();
      }
    },

    keepGroupSelected(groups) {
      const selectedGroup = this.selectedCollection[0];
      const groupName = UI.getGroupName(selectedGroup);
      groups.forEach(group => {
        if (group['name'] === groupName) {
          group['selected'] = true;
        }
      });
    },

    renderGroups() {
      const selectedGroup = this.selectedCollection[0];
      const groupsTemplate = Templates.list['groups-template'];
      const allTodos = Todos.list;
      const allGroups = Todos.getGroups(allTodos);
      const completedTodos = Todos.list.filter(Todos.isCompleted);
      const completedGroups = Todos.getGroups(completedTodos);
      const heading = this.getHeading(selectedGroup);
      heading === 'All Todos' ?
        this.keepGroupSelected(allGroups) :
        this.keepGroupSelected(completedGroups);
      this.allGroupList.innerHTML = groupsTemplate({ groups: allGroups });
      this.completedGroupList.innerHTML = groupsTemplate({ groups: completedGroups });
      this.insertHeadingCount();
      if (!Todos.edit) this.select(this.allGroupHeading);
      if (allTodos.some(todo => !Todos.hasValidDate(todo))) {
        moveUndatedGroups();
      }
    },

    renderForm(todo = Todos.blank) {
      const formTemplate = Templates.list['form-template'];
      this.todoForm.innerHTML = formTemplate(todo);
      if (todo !== Todos.blank) selectDate(todo);
    },

    insertHeadingCount() {
      this.allCount.textContent = Todos.list.length;
      this.completedCount.textContent = Todos.list.filter(Todos.isCompleted).length;
    },

    getGroupName(element) {
      return element.firstChild.textContent.trim();
    },

    getHeading(element) {
      let heading = element.tagName === 'H2' ?
        element :
        element.parentElement.previousElementSibling;
      return this.getGroupName(heading);
    },

    getItem(element) {
      return element.closest('li');
    },

    findItem(id) {
      for (let idx = 0; idx < this.todoList.children.length; idx += 1) {
        let item = this.todoList.children[idx];
        if (item['id'] === String(id)) return item;
      }
    },

    createItem(newTodo) {
      const todoTemplate = Templates.list['todo-template'];
      const html = todoTemplate(newTodo);
      const container = document.createElement('div');
      container.insertAdjacentHTML('afterbegin', html);
      return container.firstElementChild;
    },

    async updateTodo(newTodo) {
      await API.getTodos();
      const selectedGroup = this.selectedCollection[0];
      const newItem = this.createItem(newTodo);
      const id = newTodo['id'];
      const currentItem = this.findItem(id);
      const heading = UI.getHeading(selectedGroup);
      const groupName = UI.getGroupName(selectedGroup);
      const todos = Todos.getTodos(selectedGroup);
      const count = Todos.getCount(groupName, todos);
      this.renderMainHeading(groupName, count);
      this.renderGroups();
      this.isRemovableItem(newTodo, heading) ?
        currentItem.remove() :
        currentItem.replaceWith(newItem);
      moveCompletedTodos();
    },

    isRemovableItem(newTodo, heading) {
      const selectedGroup = this.selectedCollection[0];
      if (!selectedGroup) return true;
      const groupName = UI.getGroupName(selectedGroup);
      switch (heading) {
        case 'All Todos':
          switch (groupName) {
            case 'All Todos':
              return false;
            case 'No Due Date':
              return !!Todos.hasValidDate(newTodo);
            default:
              const [ groupMonth, groupYear ] = groupName.split('/');
              return !!(newTodo['month'] !== groupMonth || newTodo['year'] !== groupYear);
          }
        case 'Completed':
          switch (groupName) {
            case 'Completed':
              return !Todos.isCompleted(newTodo);
            case 'No Due Date':
              return !(!Todos.hasValidDate(newTodo) && Todos.isCompleted(newTodo));
            default:
              const [ groupMonth, groupYear ] = groupName.split('/');
              return !!(!Todos.isCompleted(newTodo) ||
                (newTodo['month'] !== groupMonth || newTodo['year'] !== groupYear));
          }
      }
    },

    async deleteTodo(id) {
      await API.getTodos();
      const selectedGroup = this.selectedCollection[0];
      const currentItem = this.findItem(id);
      const groupName = this.getGroupName(this.mainHeading);
      const todos = Todos.getTodos(selectedGroup);
      const count = Todos.getCount(groupName, todos);
      currentItem.remove();
      this.renderMainHeading(groupName, count);
      this.renderGroups();
    },

    show(element) {
      element.classList.replace('hide', 'show');
    },

    hide(element) {
      element.classList.replace('show', 'hide');
    },

    display(message) {
      alert(message);
    },

    select(element) {
      this.deselectGroups();
      element.tagName === 'SPAN' ?
        element.parentElement.classList.add('selected') :
        element.classList.add('selected');
    },

    deselectGroups() {
      const groups = document.querySelectorAll('nav h2, .groups li');
      groups.forEach(group => group.classList.remove('selected'));
    },
  };
}();

const Handlers = function() {
  return {
    clickGroup(event) {
      let element;
      let groupName;
      if (event.target.tagName === 'NAV') {
        return;
      } else if (event.target.tagName === 'SPAN') {
        element = event.target.parentElement;
        groupName = event.target.previousSibling.textContent.trim();
      } else {
        element = event.target;
        groupName = this.getGroupName(event.target);
      }

      let todos = Todos.getTodos(element);
      let count;
      if (event.target.tagName === 'H2' || event.target.parentElement.tagName === 'H2') {
        count = groupName === 'All Todos' ?
          Todos.list.length :
          Todos.list.filter(Todos.isCompleted).length;
      } else {
        count = Todos.getCount(groupName, todos);
      }

      UI.select(element);
      UI.renderTodos(todos);
      UI.renderMainHeading(groupName, count);
    },

    clickAdder() {
      Todos.edit = false;
      UI.renderForm();
      UI.show(UI.overlay);
      UI.show(UI.todoForm);
    },

    clickOverlay() {
      Todos.edit = false;
      UI.hide(UI.overlay);
      UI.hide(UI.todoForm);
    },

    clickButton(event) {
      event.preventDefault();
      if (event.target.tagName === 'BUTTON') {
        switch (event.target.id) {
          case 'save':
            const submit = new Event('submit');
            UI.todoForm.dispatchEvent(submit);
            break;
          case 'complete':
            if (Todos.edit) {
              const todo = Todos.lookup(Todos.id);
              const click = new Event('click');
              UI.overlay.dispatchEvent(click);
              Todos.edit = true;
              todo['completed'] = true;
              UI.renderForm(todo);
              API.updateTodo(Todos.id);
            } else {
              const message = 'Sorry, you must create a todo before ' +
                'you can mark it as complete.';
              UI.display(message);
            }
            break;
        }
      }
    },

    clickTodo(event) {
      Todos.id = Todos.getId(event.target);
      const todo = Todos.lookup(Todos.id);
      Todos.edit = true;
      switch (event.target.tagName) {
        case 'P':
          UI.renderForm(todo);
          UI.show(UI.overlay);
          UI.show(UI.todoForm);
          break;
        case 'LI':
          Todos.toggleCompleted(todo);
          event.target.classList.toggle('completed');
          UI.renderForm(todo);
          API.updateTodo(Todos.id);
          break;
        case 'FIGURE':
        case 'IMG':
          API.deleteTodo(Todos.id);
          break;
      }
    },

    submit(event) {
      event.preventDefault();
      const title = document.getElementById('title').value;
      if (Todos.isInvalidTitle(title)) {
        const message = 'Sorry, the title must:\n' +
          '- be at least 3 characters long\n' +
          '- have at least one alphanumeric character\n' +
          '- be unique\n' +
          '- not have dashes';
        UI.display(message);
        return;
      }
      Todos.edit ?
        API.updateTodo(Todos.id) :
        API.addTodo();
      UI.hide(UI.overlay);
      UI.hide(UI.todoForm);
    },
  };
}();

const API = function() {
  function formDataToJSON(formData) {
    if (isInvalidFormData(formData)) return;
    let object = {};
    for (let field of formData) {
      let [ name, value ] = field;
      object[name] = value;
    }

    return JSON.stringify(object);
  }

  function isInvalidFormData(formData) {
    for (let field of formData) {
      let [ name, value ] = field;
      if (name === 'title' && Todos.isInvalidTitle(value)) return true;
    }

    return false;
  }

  return {
    async addTodo() {
      const formData = new FormData(UI.todoForm);
      const json = formDataToJSON(formData);
      if (!json) return;
      const settings = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: json,
      };
      try {
        const response = await fetch('/api/todos', settings);
        response.ok ?
          UI.renderPage() :
          this.throwHttpError(response);
      } catch (err) {
        console.log(err);
      }
    },

    async getTodos() {
      const response = await fetch('/api/todos');
      const data = await response.json();
      Todos.list = Todos.clean(data);
    },

    async updateTodo(id) {
      const formData = new FormData(UI.todoForm);
      const json = formDataToJSON(formData);
      if (!json) return;
      const settings = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: json,
      };
      try {
        const response = await fetch(`/api/todos/${id}`, settings);
        if (response.ok) {
          let newTodo = await response.json();
          newTodo = Todos.clean(newTodo);
          UI.updateTodo(newTodo);
        } else {
          this.throwHttpError(response);
        }
      } catch (err) {
        console.log(err);
      }
    },

    async deleteTodo(id) {
      const settings = {
        method: 'DELETE',
      };
      try {
        const response = await fetch(`/api/todos/${id}`, settings);
        response.ok ?
          UI.deleteTodo(id) :
          this.throwHttpError(response);
      } catch (err) {
        console.log(err);
      }
    },

    throwHttpError(response) {
      throw new Error(`HTTP Error. Status: ${response.status}`);
    },
  };
}();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
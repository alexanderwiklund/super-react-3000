console.log(`I'm running!`);

const React = {
  createElement: (type, props, ...children) => {
    if (props === null) props = {};
    return {type, props, children};
  }
};

/**
 * Parse a prop and attach it to the element if applicable.
 * @param {Element} element 
 * @param {string} key 
 * @param {*} value 
 */
const parseProp = (element, propName, value) => {
  if (typeof value == 'function' && propName.startsWith('on')) {
      const eventType = propName.slice(2).toLowerCase();
      element.__eventHandlers = element.__eventHandlers || {};
      element.removeEventListener(eventType, element.__eventHandlers[eventType]);
      element.__eventHandlers[eventType] = value;
      element.addEventListener(eventType, element.__eventHandlers[eventType]);
  }
  else if (propName == 'checked' || propName == 'value' || propName == 'className') {
      element[propName] = value;
  }
  else if (propName == 'style' && typeof value == 'object') {
      Object.assign(element.style, value);
  }
  else if (propName == 'ref' && typeof value == 'function') {
      value(element);
  }
  else if (propName == 'key') {
    element.__key = value;
  }
  else if (typeof value != 'object' && typeof value != 'function') {
      element.setAttribute(propName, value);
  }
};

/**
 * Turn a vDom node into an actual DOM node,
 * appending to a parent node if required.
 * 
 * @param {vDom} vdom
 * @param {Element} parent
 * 
 * @returns {Element}
 */
const render = (vDom, parent=null) => {
  const appentToParent = element => parent.appendChild(element);
  const returnElement = element => element;
  const mount = parent ? appentToParent : returnElement;

  if (typeof vDom == 'string' || typeof vDom == 'number') {
    console.debug(`Rendering string or number node ${vDom}`);
    return mount(document.createTextNode(vDom));
  }
  else if (typeof vDom == 'boolean' || vDom === null) {
    console.debug(`Rendering bool or null node ${vDom} (an empty node)`);
    return mount(document.createTextNode(''));
  }
  else if (typeof vDom == 'object' && typeof vDom.type == 'function') {
    return Component.render(vDom, parent);
  }
  else if (typeof vDom == 'object' && typeof vDom.type == 'string') {
    console.debug(`Rendering node of type ${vDom.type} and all child nodes`);
    const element = document.createElement(vDom.type);

    //Flatten the children array and render them before appending.
    [].concat(...vDom.children).forEach((child) => {
      const renderedChild = render(child);
      element.appendChild(renderedChild);
    })

    Object.entries(vDom.props).forEach(([propName, value]) => {
      parseProp(element, propName, value);
    });

    return mount(element);
  }
  else {
    console.error(`Invalid VDOM: ${vDom}.`);
  }
};

/**
 * Given an element and a vDom of the same type compare the children of each of them,
 * update the ones that differ and remove any nodes that do not exist in the vDom anymore.
 * @param {Element} element 
 * @param {vDom} vDom 
 * @returns {Element}
 */
const childReconciliation = (element, vDom) => {
  const pool = {};
  const active = document.activeElement;

  //Add all previous child nodes to the pool
  [].concat(...element.childNodes).forEach((child, index) => {
    const key = child.__key || `__index_${index}`;
    pool[key] = child;
  });

  //Render all vDom nodes. If the same key is in the pool we've already rendered it
  //and can remove it from the pool.
  [].concat(...vDom.children).forEach((child, index) => {
    const key = child.props && child.props.key || `__index_${index}`;
    element.appendChild(pool[key] ? patch(pool[key], child) : render(child, element));
    delete pool[key];
  });

  Object.values(pool).forEach((child) => {
    const instance = child.__instance;
    if (instance) {
      instance.componentWillUnmount();
    }
    child.remove();
  });
  Object.values(element.attributes).forEach((attribute) => {
    element.removeAttribute(attribute.name)
  });
  Object.entries(vDom.props).forEach(([propName, value]) => {
    parseProp(element, propName, value);
  });

  active.focus();
  return element;
}

/**
 * Compare an updated vDom with the current DOM structure, only rerendering each node
 * if it's different from the current node.
 * @param {Element} element 
 * @param {vDom} vDom 
 * @param {Element} parent 
 * @returns {Element}
 */
const patch = (element, vDom, parent=element.parentNode) => {
  const replaceChild = newElement => {
    element.replaceWith(newElement);
    return newElement;
  };
  const returnElement = element => element;
  const replace = parent ? replaceChild : returnElement;

  //Components have their own patch method.
  if (typeof vDom == 'object' && typeof vDom.type == 'function') {
    return Component.patch(element, vDom, parent);
  }
  //Comparing simple vDom with simple Text node: Compare content.
  else if (typeof vDom != 'object' && element instanceof Text) {
    return element.textContent != vDom ? replace(render(vDom, parent)) : element;
  }
  //Comparing complex vDom with simple Text node: Full rerender.
  else if (typeof vDom == 'object' && element instanceof Text) {
    return replace(render(vDom, parent));
  }
  //Comparing complex vDom with complex DOM node of different type: Full rerender.
  else if (typeof vDom == 'object' && element.nodeName != vDom.type.toUpperCase()) {
    return replace(render(vDom, parent));
  }
  //Comparing complex vDom with complex DOM node of the same type: Reconciliation.
  else if (typeof vDom == 'object' && element.nodeName == vDom.type.toUpperCase()) {
    return childReconciliation(element, vDom);
  }
};

class Component {
  constructor(props) {
    this.props = props || {};
    this.state = null;
  }

  static render(vDom, parent=null) {
    const props = Object.assign({}, vDom.props, {children: vDom.children});

    if (Component.isPrototypeOf(vDom.type)) {
      const instance = new (vDom.type)(props);
      instance.componentWillMount();
      instance.base = render(instance.render(), parent);
      instance.base.__instance = instance;
      instance.base.__key = vDom.props.key;
      instance.componentDidMount();
      return instance.base;
    }
    return render(vDom.type(props), parent);
  }

  static patch(element, vDom, parent=element.parentNode) {
    const props = Object.assign({}, vDom.props, {children: vDom.children});

    if (element.__instance && element.__instance.constructor == vDom.type) {
      element.__instance.componentWillReceiveProps(props);
      element.__instance.props = props;
      return patch(element, element.__instance.render(), parent);
    }
    else if (Component.isPrototypeOf(vDom.type)) {
      const replaceChild = newElement => {
        element.replaceWith(newElement);
        return newElement;
      };
      const returnElement = element => element;
      const replace = parent ? replaceChild : returnElement;

      const newElement = Component.render(vDom, parent);
      return replace(newElement);
    }
    else if (!Component.isPrototypeOf(vDom.type)) {
      return patch(element, vDom.type(props), parent);
    }
  }

  setState(nextState) {
    if (this.base && this.shouldComponentUpdate(this.props, nextState)) {
      const prevState = this.state;
      this.componentWillUpdate(this.props, nextState);
      this.state = nextState;
      patch(this.base, this.render());
      this.componentDidUpdate(this.props, prevState);
    } else {
      this.state = nextState;
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return nextProps != this.props || nextState != this.state;
  }

  componentWillReceiveProps(nextProps) {
    return undefined;
  }

  componentWillUpdate(nextProps, nextState) {
    return undefined;
  }

  componentDidUpdate(prevProps, prevState) {
    return undefined;
  }

  componentWillMount() {
    return undefined;
  }

  componentDidMount() {
    return undefined;
  }

  componentWillUnmount() {
    return undefined;
  }
}

class TodoItem extends Component {
  render() {
    return <li className="todo__item">
      <span>{this.props.text} - </span>
      <span>{this.props.key} - </span>
      <a href="#" onClick={this.props.onClick}>X</a>
    </li>;
  }
}

class Todo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      input: '',
      items: [],
    };
    this.handleAdd('Goal #1');
    this.handleAdd('Goal #2');
    this.handleAdd('Goal #3');
  }
  
  handleInput(e) {
    this.setState({
      input: e.target.value,
      items: this.state.items,
    });
  }
  
  handleAdd(text) {
    const newItems = [].concat(this.state.items);
    newItems.push({
      id: Math.random(),
      text,
    });
    this.setState({
      input: '',
      items: newItems,
    });
  }
  
  handleRemove(index) {
    const newItems = [].concat(this.state.items);
    newItems.splice(index, 1);
    this.setState({
      input: this.state.input,
      items: newItems,
    });
  }
  
  render() {
    return <div className="todo">
      <ul className="todo__items">
        {this.state.items.map((item, index) => <TodoItem
          key={item.id}
          text={item.text}
          onClick={e => this.handleRemove(index)}
        />)}
      </ul>
      <input type="text" onInput={e => this.handleInput(e)} value={this.state.input}/>
      <button onClick={e => this.handleAdd(this.state.input)}>Add</button>
      {true}
    </div>;
  }
}

render(<Todo/>, document.getElementById('two'));

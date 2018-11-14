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
  //Remove any previous content since we're rerendering.
  if (parent) parent.textContent = '';

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

  Object.values(pool).forEach((child) => child.remove());
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
    parent.replaceChild(newElement, element);
    return newElement;
  };
  const returnElement = element => element;
  const replace = parent ? replaceChild : returnElement;

  //Comparing simple vDom with simple Text node: Compare content.
  if (typeof vDom != 'object' && element instanceof Text) {
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

render('Hello World!', document.getElementById('one'));

const list = (
  <ul className="list">
    <li className="list_item"
      key="one"
      style={ { color: 'red' } }
      ref={(element) => {
        console.debug(`Did we just add styling to our element?`, element.style);
      }}
      onClick={(event) => console.debug(`Received click!`, event)}
    >One</li>
    <li className="list_item"
      key="two"
    >Two</li>
  </ul>
);

const currentDOM = render(list, document.getElementById('two'));

const newList = (
  <ul className="list">
    <li className="list_item"
      key="one"
      style={ { color: 'blue' } }
      ref={(element) => {
        console.debug(`We patched our element, text should be blue instead.`, element.style);
      }}
      onClick={(event) => console.debug(`Received click on a patched element!`, event)}
    >One</li>
    <li className="list_item"
      key="three"
    >Three</li>
  </ul>
);

setTimeout(() => patch(currentDOM, newList), 5000);
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

render('Hello World!', document.getElementById('one'));

const list = (
  <ul className="list">
    <li className="list_item"
      style={ { color: 'red' } }
      ref={(element) => {
        console.debug(`Did we just add styling to our element?`, element.style);
      }}
      onClick={(event) => console.debug(`Received click!`, event)}
    >One</li>
    <li className="list_item">Two</li>
  </ul>
);

render(list, document.getElementById('two'));

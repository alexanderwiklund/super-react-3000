console.log(`I'm running!`);

const React = {
  createElement: (type, props, ...children) => {
    if (props === null) props = {};
    return {type, props, children};
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

    return mount(element);
  }
  else {
    console.error(`Invalid VDOM: ${vDom}.`);
  }
};

render('Hello World!', document.getElementById('one'));

const list = (
  <ul className="list">
    <li className="list_item">One</li>
    <li className="list_item">Two</li>
  </ul>
);

render(list, document.getElementById('two'));

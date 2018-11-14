console.log(`I'm running!`);

const React = {
  createElement: (type, props, ...children) => {
    if (props === null) props = {};
    return {type, props, children};
  }
};

const html = (
  <div>
    Hello World!
  </div>
);

document.getElementById('one').textContent = JSON.stringify(html, null, 4);

const moreHtml = (
  <ul className="some-list">
    <li className="some-list__item">One</li>
    <li className="some-list__item">Two</li>
  </ul>
);

document.getElementById('two').textContent = JSON.stringify(moreHtml, null, 4);

import { ViewFrameNode } from '@/lib/compass-planes/nodes/components/frame/frame-node';
import type { Component } from '@/types';

describe('FrameNode Component', () => {
  const createFrameComponent = (data: any, style: any = {}): Component => ({
    id: 'frame-1',
    type: 'frame',
    x: 0,
    y: 0,
    z: 1,
    rulesetId: '',
    rotation: 0,
    width: 400,
    height: 300,
    data: JSON.stringify(data),
    style: JSON.stringify({
      backgroundColor: '#ffffff',
      borderRadius: '0px',
      outline: 'solid',
      outlineWidth: 1,
      outlineColor: '#cccccc',
      ...style,
    }),
    locked: false,
    windowId: 'window-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it('should render iframe with URL', () => {
    const component = createFrameComponent({
      url: 'https://example.com',
    });

    cy.mount(<ViewFrameNode component={component} />);

    cy.get('iframe').should('have.attr', 'src', 'https://example.com');
  });

  it('should apply width and height', () => {
    const component = createFrameComponent({
      url: 'https://example.com',
    });

    cy.mount(<ViewFrameNode component={component} />);

    cy.get('iframe').should('have.css', 'width', '400px');
    cy.get('iframe').should('have.css', 'height', '300px');
  });

  it('should have no border', () => {
    const component = createFrameComponent({
      url: 'https://example.com',
    });

    cy.mount(<ViewFrameNode component={component} />);

    cy.get('iframe').should('have.css', 'border', '0px none rgb(0, 0, 0)');
  });

  it('should apply background color from style', () => {
    const component = createFrameComponent(
      {
        url: 'https://example.com',
      },
      {
        backgroundColor: '#f0f0f0',
      },
    );

    cy.mount(<ViewFrameNode component={component} />);

    cy.get('iframe').should('have.css', 'background-color', 'rgb(240, 240, 240)');
  });

  it('should apply border radius', () => {
    const component = createFrameComponent(
      {
        url: 'https://example.com',
      },
      {
        borderRadius: '8px',
      },
    );

    cy.mount(<ViewFrameNode component={component} />);

    cy.get('iframe').should('have.css', 'border-radius', '8px');
  });

  it('should not render when URL is empty', () => {
    const component = createFrameComponent({
      url: '',
    });

    cy.mount(<ViewFrameNode component={component} />);

    cy.get('iframe').should('not.exist');
  });

  it('should not render when URL is whitespace', () => {
    const component = createFrameComponent({
      url: '   ',
    });

    cy.mount(<ViewFrameNode component={component} />);

    cy.get('iframe').should('not.exist');
  });

  it('should not render when URL is undefined', () => {
    const component = createFrameComponent({});

    cy.mount(<ViewFrameNode component={component} />);

    cy.get('iframe').should('not.exist');
  });

  it('should have title attribute', () => {
    const component = createFrameComponent({
      url: 'https://example.com',
    });

    cy.mount(<ViewFrameNode component={component} />);

    cy.get('iframe').should('have.attr', 'title', 'Embedded content');
  });

  it('should apply opacity from style', () => {
    const component = createFrameComponent(
      {
        url: 'https://example.com',
      },
      {
        opacity: 0.8,
      },
    );

    cy.mount(<ViewFrameNode component={component} />);

    cy.get('iframe').should('have.css', 'opacity', '0.8');
  });

  it('should handle different URL formats', () => {
    const urls = [
      'https://example.com',
      'http://example.com',
      'https://example.com/path/to/page',
      'https://example.com?query=param',
    ];

    urls.forEach((url) => {
      const component = createFrameComponent({ url });
      cy.mount(<ViewFrameNode component={component} />);
      cy.get('iframe').should('have.attr', 'src', url);
    });
  });
});

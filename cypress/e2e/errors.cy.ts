describe('No error overlays and no console errors', () => {
  beforeEach(() => {
    cy.on('window:before:load', (win) => {
      cy.stub(win.console, 'error').as('consoleError');
    });
  });

  it('home renders cleanly', () => {
    cy.visit('/');
    cy.get('@consoleError').should('not.be.called');
    cy.findByTestId('feeds-list');
    cy.findAllByTestId('router_error_message').should('have.length', 0);
  });

  it('modal renders cleanly', () => {
    cy.visit('/modal');
    cy.get('@consoleError').should('not.be.called');
    cy.findAllByTestId('router_error_message').should('have.length', 0);
  });
});
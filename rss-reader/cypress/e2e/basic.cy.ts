describe('RSS Reader Web', () => {
  it('loads home and adds a feed', () => {
    cy.visit('/');
    cy.findByTestId('feed-url-input').type('https://hnrss.org/frontpage');
    cy.findByTestId('add-feed-button').click();
    // The list should render at least one item after fetch + parse (may require network)
    cy.findByTestId('feeds-list');
  });
});


describe('State migration and feed page stability', () => {
  beforeEach(() => {
    cy.on('window:before:load', (win: any) => {
      const legacy = {
        feeds: [],
        bookmarks: {}
      };
      win.localStorage.setItem('rss_reader_state_v1', JSON.stringify(legacy));
    });
  });

  it('does not crash on home with legacy state', () => {
    cy.visit('/');
    cy.findAllByTestId('router_error_message').should('have.length', 0);
  });

  it('adds a feed and opens feed page without overlay', () => {
    cy.stubHnRss();
    cy.visit('/');
    cy.findByTestId('feed-url-input').clear().type('https://hnrss.org/frontpage');
    cy.findByTestId('add-feed-button').click();
    cy.findAllByTestId('feed-row').first().findByTestId('feed-open').click({ force: true });
    cy.findAllByTestId('router_error_message').should('have.length', 0);
  });
});
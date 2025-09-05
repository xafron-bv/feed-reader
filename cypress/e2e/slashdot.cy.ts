describe('Slashdot feed handling (RDF + gzip header)', () => {
  it('adds Slashdot feed and shows articles', () => {
    cy.on('window:before:load', (win: any) => {
      try { win.localStorage.setItem('rss_reader_state_v1', JSON.stringify({ feeds: [], bookmarks: {}, reads: {}, collections: [], settings: { backgroundSyncEnabled: true } })); } catch {}
    });
    // Stub normal and proxy URLs; set gzip header to simulate compressed response
    cy.intercept('GET', 'https://rss.slashdot.org/Slashdot/slashdot*', {
      fixture: 'slashdot.rdf',
      headers: { 'content-type': 'application/rss+xml; charset=UTF-8' },
    }).as('slashdot');
    cy.intercept('GET', 'https://go.x2u.in/proxy?*url=https%3A%2F%2Frss.slashdot.org%2FSlashdot%2Fslashdot*', {
      fixture: 'slashdot.rdf',
      headers: { 'content-type': 'application/rss+xml; charset=UTF-8' },
    }).as('slashdotProxy');

    cy.visit('/');
    cy.findByTestId('feed-url-input').clear().type('https://rss.slashdot.org/Slashdot/slashdot');
    cy.findByTestId('add-feed-button').click();
    cy.wait(['@slashdot', '@slashdotProxy']);
    cy.window().should((win: any) => {
      const raw = win.localStorage.getItem('rss_reader_state_v1');
      expect(raw).to.be.a('string');
      const state = JSON.parse(raw as string);
      expect(state.feeds).to.be.an('array').and.to.have.length.greaterThan(0);
    });
    cy.findAllByTestId('feed-row').first().findByTestId('feed-open').click({ force: true });
    cy.findByTestId('articles-list');
    cy.findAllByTestId('article-row').should('have.length.greaterThan', 0);
  });
});


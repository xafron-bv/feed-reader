describe('Feed metadata (title, description, favicon)', () => {
  it('saves and displays feed title, description, and favicon after adding', () => {
    cy.stubHnRss();
    cy.visit('/');
    cy.findByTestId('feed-url-input').clear().type('https://hnrss.org/frontpage');
    cy.findByTestId('add-feed-button').click();

    // Title should be the feed title from XML
    cy.findAllByTestId('feed-row').first().within(() => {
      cy.contains('HN Frontpage');
      cy.findByText('Frontpage links');
      cy.findByTestId('feed-favicon').should('exist');
    });

    // Assert that the state persisted includes faviconUrl, title, and description
    cy.window().should((win: any) => {
      const raw = win.localStorage.getItem('rss_reader_state_v1');
      expect(raw, 'state exists').to.be.a('string');
      const state = JSON.parse(raw);
      expect(state.feeds, 'feeds array').to.be.an('array').and.to.have.length.greaterThan(0);
      const f = state.feeds[0];
      expect(f.title).to.eq('HN Frontpage');
      expect(f.description).to.eq('Frontpage links');
      expect(f.faviconUrl).to.contain('news.ycombinator.com/favicon.ico');
    });
  });
});


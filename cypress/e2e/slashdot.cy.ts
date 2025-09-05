describe('Slashdot feed handling (RDF + gzip header)', () => {
  it('adds Slashdot feed and stores correct feed info', () => {
    cy.on('window:before:load', (win: any) => {
      try {
        win.localStorage.setItem('rss_reader_state_v1', JSON.stringify({ feeds: [], bookmarks: {}, reads: {}, collections: [], settings: { backgroundSyncEnabled: true } }));
        win.localStorage.setItem('rss_reader_cors_blocked', '1');
      } catch {}
    });
    // Stub only the proxy URL used by our net layer
    cy.intercept('GET', 'https://go.x2u.in/proxy?*url=https%3A%2F%2Frss.slashdot.org%2FSlashdot%2Fslashdot*', {
      fixture: 'slashdot.rdf',
      headers: { 'content-type': 'application/rss+xml; charset=UTF-8' },
    }).as('slashdotProxy');

    cy.visit('/');
    cy.findByTestId('feed-url-input').clear().type('https://rss.slashdot.org/Slashdot/slashdot');
    cy.findByTestId('add-feed-button').click();
    cy.wait('@slashdotProxy');
    // Validate persisted feed info
    cy.window().should((win: any) => {
      const raw = win.localStorage.getItem('rss_reader_state_v1');
      expect(raw).to.be.a('string');
      const state = JSON.parse(raw as string);
      expect(state.feeds).to.be.an('array').and.to.have.length.greaterThan(0);
      const feed = state.feeds.find((f: any) => (f.url || '').includes('slashdot'));
      expect(feed, 'slashdot feed exists').to.exist;
      expect(feed.title).to.eq('Slashdot');
      expect(feed.description).to.contain('News for nerds');
      expect(feed.siteUrl).to.eq('https://slashdot.org/');
      expect(feed.faviconUrl).to.eq('https://slashdot.org/favicon.ico');
    });
  });
});


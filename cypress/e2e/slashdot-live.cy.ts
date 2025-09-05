describe('Slashdot live feed (no mocks)', () => {
  beforeEach(() => {
    cy.on('window:before:load', (win: any) => {
      try {
        // Start clean and force proxy mode so browser CORS does not block
        win.localStorage.setItem(
          'rss_reader_state_v1',
          JSON.stringify({ feeds: [], bookmarks: {}, reads: {}, collections: [], settings: { backgroundSyncEnabled: true } })
        );
        win.localStorage.setItem('rss_reader_cors_blocked', '1');
      } catch {}
    });
  });

  it('adds real Slashdot URL and persists correct feed info', () => {
    const url = 'https://rss.slashdot.org/Slashdot/slashdot';
    cy.visit('/');
    cy.findByTestId('feed-url-input').clear().type(url);
    cy.findByTestId('add-feed-button').click();

    // Placeholder appears then resolves to a real feed row
    cy.findByTestId('feed-row-loading', { timeout: 30000 });
    cy.findAllByTestId('feed-row', { timeout: 30000 }).first();
    cy.findAllByTestId('feed-row-loading').should('have.length', 0);

    // Validate persisted state matches Slashdot metadata
    cy.window().should((win: any) => {
      const raw = win.localStorage.getItem('rss_reader_state_v1');
      expect(raw, 'state').to.be.a('string');
      const state = JSON.parse(raw as string);
      expect(state.feeds, 'feeds').to.be.an('array').and.to.have.length.greaterThan(0);
      const feed = state.feeds.find((f: any) => (f.url || '').includes('slashdot'));
      expect(feed, 'slashdot feed exists').to.exist;
      expect(feed.title).to.eq('Slashdot');
      expect(feed.description).to.match(/News for nerds/i);
      expect(feed.siteUrl).to.match(/^https?:\/\/slashdot\.org\/?$/);
      expect(feed.faviconUrl).to.eq('https://slashdot.org/favicon.ico');
    });
  });
});


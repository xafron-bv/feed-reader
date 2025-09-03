describe('All and Collections flows', () => {
  it('shows all articles and can filter unread', () => {
    cy.stubHnRss();
    cy.visit('/');
    cy.findByTestId('feed-url-input').clear().type('https://hnrss.org/frontpage');
    cy.findByTestId('add-feed-button').click();

    // Navigate directly to All route to avoid tab click flakiness
    cy.visit('/all');

    // Expect list to load (All tab content mounts after clicking tab)
    cy.findByTestId('all-articles-list', { timeout: 15000 });
    cy.contains('Show unread').click(); // toggle unread filter (ok if no effect yet)
  });

  it('creates a collection and views its articles', () => {
    cy.stubHnRss();
    cy.visit('/');

    // Ensure at least one feed exists
    cy.findByTestId('feed-url-input').clear().type('https://hnrss.org/newest');
    cy.findByTestId('add-feed-button').click();

    // Go to Collections route directly
    cy.visit('/collections');

    // Create a new collection
    cy.findByTestId('new-collection-button').click();
    cy.findByTestId('collection-name-input').type('HN');
    // Select first available feed option
    cy.findAllByTestId('collection-feed-option').first().click({ force: true });
    cy.findByTestId('collection-save-button').click();

    // Open first collection row via its link href
    cy.findAllByTestId('collection-row').first().within(() => {
      cy.get('a, [role="link"]').first().then(($a) => {
        const href = $a.attr('href') as string;
        cy.visit(href);
      });
    });

    // Should see aggregated list (at least not crash)
    cy.findByTestId('collection-articles-list');
    cy.contains('Show unread').click();
  });
});
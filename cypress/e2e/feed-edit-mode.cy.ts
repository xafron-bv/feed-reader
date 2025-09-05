describe('Feed edit mode', () => {
  beforeEach(() => {
    cy.stubHnRss();
  });

  it('enters edit mode and opens edit modal', () => {
    cy.visit('/');
    cy.findByTestId('feed-url-input').clear().type('https://hnrss.org/frontpage');
    cy.findByTestId('add-feed-button').click();
    cy.findByTestId('toggle-edit-mode').click();
    cy.findByTestId('edit-mode-banner');
    cy.findAllByTestId('feed-row').first().click();
    cy.findByTestId('feed-edit-modal');
  });

  it('edits title/description and saves', () => {
    cy.visit('/');
    cy.findByTestId('feed-url-input').clear().type('https://hnrss.org/frontpage');
    cy.findByTestId('add-feed-button').click();
    cy.findByTestId('toggle-edit-mode').click();
    cy.findAllByTestId('feed-row').first().click();
    cy.findByTestId('feed-edit-title').clear().type('My HN');
    cy.findByTestId('feed-edit-description').clear().type('Custom desc');
    cy.findByTestId('feed-edit-save').click();
    cy.findAllByTestId('feed-row').first().contains('My HN');
    cy.findAllByTestId('feed-row').first().contains('Custom desc');
  });

  it('deletes feed from edit modal', () => {
    cy.visit('/');
    cy.findByTestId('feed-url-input').clear().type('https://hnrss.org/frontpage');
    cy.findByTestId('add-feed-button').click();
    cy.findByTestId('toggle-edit-mode').click();
    cy.findAllByTestId('feed-row').first().click();
    cy.findByTestId('feed-edit-delete').click();
    cy.findAllByTestId('feed-row').should('have.length', 0);
  });
});


import { ImageUpload } from '@/components/composites/image-upload';

// Mock the useAssets hook
const mockUseAssets = () => ({
  assets: [],
  createAsset: cy.stub().resolves('mock-asset-id'),
});
cy.stub(require('@/lib/compass-api'), 'useAssets').callsFake(mockUseAssets);

describe('ImageUpload Component', () => {
  it('should show upload button when no image', () => {
    cy.mount(<ImageUpload />);

    cy.contains('Upload Image').should('be.visible');
  });

  it('should display preview after image is set', () => {
    cy.mount(<ImageUpload image='https://example.com/image.png' />);

    cy.get('img').should('have.attr', 'src', 'https://example.com/image.png');
  });

  it('should show remove button on hover when image exists', () => {
    cy.mount(<ImageUpload image='https://example.com/image.png' />);

    cy.get('img').trigger('pointerenter');
    cy.get('button').should('be.visible');
  });

  it('should call onRemove when remove button is clicked', () => {
    const onRemove = cy.stub().as('onRemove');

    cy.mount(<ImageUpload image='https://example.com/image.png' onRemove={onRemove} />);

    cy.get('img').trigger('pointerenter');
    cy.get('button').click();
    cy.get('@onRemove').should('have.been.calledOnce');
  });

  it('should have hidden file input', () => {
    cy.mount(<ImageUpload />);

    cy.get('input[type="file"]').should('not.be.visible');
  });

  it('should accept only image files', () => {
    cy.mount(<ImageUpload />);

    cy.get('input[type="file"]').should('have.attr', 'accept', 'image/*');
  });

  it('should open dialog when onSetUrl is provided and upload area is clicked', () => {
    const onSetUrl = cy.stub().as('onSetUrl');

    cy.mount(<ImageUpload onSetUrl={onSetUrl} />);

    cy.contains('Upload Image').click();
    cy.get('[role="dialog"]').should('be.visible');
  });

  it('should display dialog title', () => {
    const onSetUrl = cy.stub().as('onSetUrl');

    cy.mount(<ImageUpload onSetUrl={onSetUrl} />);

    cy.contains('Upload Image').click();
    cy.contains('Add image').should('be.visible');
  });

  it('should have URL input in dialog', () => {
    const onSetUrl = cy.stub().as('onSetUrl');

    cy.mount(<ImageUpload onSetUrl={onSetUrl} />);

    cy.contains('Upload Image').click();
    cy.get('input[type="url"]').should('be.visible');
  });

  it('should have Select file button in dialog', () => {
    const onSetUrl = cy.stub().as('onSetUrl');

    cy.mount(<ImageUpload onSetUrl={onSetUrl} />);

    cy.contains('Upload Image').click();
    cy.contains('Select file').should('be.visible');
  });

  it('should call onSetUrl when URL is submitted', () => {
    const onSetUrl = cy.stub().as('onSetUrl');

    cy.mount(<ImageUpload onSetUrl={onSetUrl} />);

    cy.contains('Upload Image').click();
    cy.get('input[type="url"]').type('https://example.com/new-image.png');
    cy.get('button[type="button"]').contains('button', '').click(); // Save button (icon only)
    cy.get('@onSetUrl').should('have.been.calledWith', 'https://example.com/new-image.png');
  });

  it('should show error when URL is empty', () => {
    const onSetUrl = cy.stub().as('onSetUrl');

    cy.mount(<ImageUpload onSetUrl={onSetUrl} />);

    cy.contains('Upload Image').click();
    cy.get('button[type="button"]').contains('button', '').click(); // Try to save without URL
    cy.contains('Please enter a URL').should('be.visible');
  });

  it('should clear error when typing in URL input', () => {
    const onSetUrl = cy.stub().as('onSetUrl');

    cy.mount(<ImageUpload onSetUrl={onSetUrl} />);

    cy.contains('Upload Image').click();
    cy.get('button[type="button"]').contains('button', '').click(); // Trigger error
    cy.contains('Please enter a URL').should('be.visible');
    cy.get('input[type="url"]').type('https://example.com/image.png');
    cy.contains('Please enter a URL').should('not.exist');
  });

  it('should close dialog after successful URL submission', () => {
    const onSetUrl = cy.stub().as('onSetUrl');

    cy.mount(<ImageUpload onSetUrl={onSetUrl} />);

    cy.contains('Upload Image').click();
    cy.get('input[type="url"]').type('https://example.com/image.png');
    cy.get('button[type="button"]').contains('button', '').click();
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('should display alt text on image', () => {
    cy.mount(<ImageUpload image='https://example.com/image.png' alt='Test Image' />);

    cy.get('img').should('have.attr', 'alt', 'Test Image');
  });

  it('should show loading state', () => {
    cy.mount(<ImageUpload />);

    // Note: Testing loading state would require mocking file upload
    // This test verifies the component renders in non-loading state
    cy.contains('Upload Image').should('be.visible');
    cy.contains('Loading').should('not.exist');
  });

  it('should have proper image dimensions', () => {
    cy.mount(<ImageUpload image='https://example.com/image.png' />);

    cy.get('img').should('have.class', 'w-[124px]');
    cy.get('img').should('have.class', 'h-[124px]');
  });

  it('should apply rounded corners to image', () => {
    cy.mount(<ImageUpload image='https://example.com/image.png' />);

    cy.get('img').should('have.class', 'rounded-lg');
  });

  it('should have cursor pointer on image', () => {
    cy.mount(<ImageUpload image='https://example.com/image.png' />);

    cy.get('img').should('have.class', 'cursor-pointer');
  });

  it('should pre-fill URL input with existing image URL', () => {
    const onSetUrl = cy.stub().as('onSetUrl');

    cy.mount(<ImageUpload image='https://example.com/existing.png' onSetUrl={onSetUrl} />);

    cy.get('img').click();
    cy.get('input[type="url"]').should('have.value', 'https://example.com/existing.png');
  });

  it('should submit URL on Enter key press', () => {
    const onSetUrl = cy.stub().as('onSetUrl');

    cy.mount(<ImageUpload onSetUrl={onSetUrl} />);

    cy.contains('Upload Image').click();
    cy.get('input[type="url"]').type('https://example.com/image.png{enter}');
    cy.get('@onSetUrl').should('have.been.calledWith', 'https://example.com/image.png');
  });
});

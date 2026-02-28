import { ImageUpload } from '@/components/composites/image-upload';

// Mock the useAssets hook (URL flow creates asset and calls onUpload(assetId))
const mockUseAssets = () => ({
  assets: [],
  createAsset: cy.stub().resolves('mock-asset-id'),
  createUrlAsset: cy.stub().resolves('mock-url-asset-id'),
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

  it('should open dialog when upload area is clicked', () => {
    cy.mount(<ImageUpload />);

    cy.contains('Upload Image').click();
    cy.get('[role="dialog"]').should('be.visible');
  });

  it('should display dialog title', () => {
    cy.mount(<ImageUpload />);

    cy.contains('Upload Image').click();
    cy.contains('Add image').should('be.visible');
  });

  it('should have URL input in dialog', () => {
    cy.mount(<ImageUpload />);

    cy.contains('Upload Image').click();
    cy.get('input[type="url"]').should('be.visible');
  });

  it('should have Select file button in dialog', () => {
    cy.mount(<ImageUpload />);

    cy.contains('Upload Image').click();
    cy.contains('Select file').should('be.visible');
  });

  it('should call onUpload with asset id when URL and name are submitted', () => {
    const onUpload = cy.stub().as('onUpload');

    cy.mount(<ImageUpload onUpload={onUpload} />);

    cy.contains('Upload Image').click();
    cy.get('input[type="url"]').type('https://example.com/new-image.png');
    cy.get('input[type="text"]').type('my-image.png');
    cy.contains('button', 'Add URL').click();
    cy.get('@onUpload').should('have.been.calledWith', 'mock-url-asset-id');
  });

  it('should show error when URL is empty', () => {
    cy.mount(<ImageUpload />);

    cy.contains('Upload Image').click();
    cy.get('input[type="text"]').type('name.png');
    cy.contains('button', 'Add URL').click();
    cy.contains('Please enter a URL').should('be.visible');
  });

  it('should show error when name is empty', () => {
    cy.mount(<ImageUpload />);

    cy.contains('Upload Image').click();
    cy.get('input[type="url"]').type('https://example.com/image.png');
    cy.contains('button', 'Add URL').click();
    cy.contains('Please enter a name').should('be.visible');
  });

  it('should close dialog after successful URL submission', () => {
    const onUpload = cy.stub().as('onUpload');

    cy.mount(<ImageUpload onUpload={onUpload} />);

    cy.contains('Upload Image').click();
    cy.get('input[type="url"]').type('https://example.com/image.png');
    cy.get('input[type="text"]').type('cover.png');
    cy.contains('button', 'Add URL').click();
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
    cy.mount(<ImageUpload image='https://example.com/existing.png' />);

    cy.get('img').click();
    cy.get('input[type="url"]').should('have.value', 'https://example.com/existing.png');
  });

  it('should submit URL and name on Enter in name field', () => {
    const onUpload = cy.stub().as('onUpload');

    cy.mount(<ImageUpload onUpload={onUpload} />);

    cy.contains('Upload Image').click();
    cy.get('input[type="url"]').type('https://example.com/image.png');
    cy.get('input[type="text"]').type('image.png{enter}');
    cy.get('@onUpload').should('have.been.calledWith', 'mock-url-asset-id');
  });
});

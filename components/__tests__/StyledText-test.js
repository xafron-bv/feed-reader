import * as React from 'react';
import renderer from 'react-test-renderer';

import { MonoText } from '../StyledText';

it(`renders correctly`, () => {
  let root;
  renderer.act(() => {
    root = renderer.create(<MonoText>Snapshot test!</MonoText>);
  });
  expect(root.toJSON()).toMatchSnapshot();
  renderer.act(() => {
    root.unmount();
  });
});

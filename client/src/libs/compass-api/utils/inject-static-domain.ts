import { getApiEndpoint } from '@/constants';
import { ApolloLink } from '@apollo/client';

/**
 * Image srcs are stored without a domain. This link adds the domain to the srcs.
 *
 * This isn't recommended for production use. If you're using a CDN, you should store the full domain.
 */
export const addStaticDomain = new ApolloLink((operation, forward) => {
  const host = `${getApiEndpoint()}/storage`;

  function shouldUpdate(src: string) {
    return src && !src.includes('http');
  }

  const replacementExpressions = [
    new RegExp(/"avatarSrc":"([^"]*)"/),
    new RegExp(/"src":"([^"]*)"/),
  ];

  return forward(operation).map((data) => {
    if (data.data?.images) {
      data.data.images = data.data.images.map((image: any) => {
        if (shouldUpdate(image.src)) {
          image.src = `${host}/images/${image.src}`;
        }
        return image;
      });
    } else if (data.data) {
      const stringifiedData = JSON.stringify(data.data);
      for (const exp of replacementExpressions) {
        const matches = stringifiedData.match(exp);
        if (matches && matches[1] && shouldUpdate(matches[1])) {
          data.data = JSON.parse(
            stringifiedData.replace(matches[1], `${host}/images/${matches[1]}`),
          );
        }
      }
    }

    return data;
  });
});

export function ShoppingBasketIcon({ color, size }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fillRule="evenodd"
      strokeLinejoin="round"
      strokeMiterlimit="2"
      clipRule="evenodd"
      viewBox="0 0 32 32"
      id="shopping-bag"
      width={size ? size : '22'}
      height={size ? size : '22'}
    >
      <path
        fill={color}
        d="M23.938 10.833H8.062L5.429 30.5h21.142l-2.633-19.667Zm-15.001 1L6.571 29.5h18.858l-2.367-17.667H8.937Z"
      ></path>
      <path
        fill={color}
        d="M23.004 11.267 20.429 30.5h6.142l-2.575-19.233h-.992zM21.571 29.5h3.858L23.5 15.1l-1.929 14.4zM11.75 7v6.5h-1V6h10v7.5h-1V7h-8z"
      ></path>
    </svg>
  );
}

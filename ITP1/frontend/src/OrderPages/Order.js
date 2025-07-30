// src/pages/OrderPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button, Input, message, Checkbox, Modal } from "antd";
import { useAuth } from "../hooks/useAuth";
import "./Order.css";
import UserComponent from "../Component/Usercomponent";

const OrderPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [isAgreed, setIsAgreed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const key = `cart_user_${user._id}`;
    const stored = JSON.parse(localStorage.getItem(key)) || [];
    setCart(stored);
    setPhone(user?.phone || "");
  }, [user]);

  const getTotalPrice = () =>
    cart.reduce((sum, i) => sum + i.finalPrice * i.quantity, 0).toFixed(2);

  const updateCartStorage = updated => {
    setCart(updated);
    localStorage.setItem(`cart_user_${user._id}`, JSON.stringify(updated));
  };

  const handleQuantityChange = (id, val) => {
    let qty = Math.max(1, Math.min(25, parseInt(val, 10) || 1));
    const upd = cart.map(i => (i._id === id ? { ...i, quantity: qty } : i));
    updateCartStorage(upd);
  };

  const handleRemoveFromCart = id => {
    const upd = cart.filter(i => i._id !== id);
    updateCartStorage(upd);
  };

  const handlePay = async () => {
    if (!user) {
      message.error("❌ Please log in first.");
      return navigate("/login");
    }
    if (!cart.length) {
      return message.error("Your cart is empty.");
    }

    try {
      // fetch live packages/products
      const [pkgRes, prodRes] = await Promise.all([
        axios.get("http://localhost:5000/api/packages"),
        axios.get("http://localhost:5000/api/products")
      ]);
      const allPackages = pkgRes.data;
      const allProducts = prodRes.data;

      // filter & enrich
      const cleanedCart = [];
      cart.forEach(item => {
        const pkg = allPackages.find(
          p => p._id === item._id || p.name === item.name
        );
        if (!pkg) {
          message.warning(
            `Package "${item.name}" no longer available, removed from cart.`
          );
          return; // skip
        }
        const enrichedProducts =
          pkg.products.map(({ productId, quantity }) => {
            const prod = allProducts.find(
              p => p._id === productId._id || p._id === productId
            );
            return {
              productId: prod?._id,
              productName: prod?.name || "Unknown",
              quantity,
              costPriceAtOrder: prod?.costPrice || 0,
              sellingPriceAtOrder: prod?.sellingPrice || 0
            };
          }) || [];

        cleanedCart.push({
          ...item,
          finalPrice: pkg.finalPrice,
          discountRate: pkg.discount || 0,
          products: enrichedProducts
        });
      });

      if (!cleanedCart.length) {
        return message.error("All items in your cart were unavailable.");
      }

      // save cleaned + enriched cart
      localStorage.setItem(
        `cart_user_${user._id}`,
        JSON.stringify(cleanedCart)
      );
      setCart(cleanedCart);

      setModalVisible(true);
    } catch (err) {
      console.error("Error preparing order:", err);
      message.error("Could not prepare order. Please try again.");
    }
  };

  const handleConfirmLocation = () => {
    if (!location.trim()) {
      return message.error("Please enter your location.");
    }
    if (!/^0\d{9}$/.test(phone.trim())) {
      return message.error(
        "Enter a valid 10-digit phone number starting with 0."
      );
    }
    if (location.trim().length < 5) {
      return message.error(
        "Enter an address at least 5 characters long."
      );
    }
    // persist and go
    localStorage.setItem(`location_user_${user._id}`, location);
    localStorage.setItem(`phone_user_${user._id}`, phone);
    localStorage.setItem(`total_price_user_${user._id}`, getTotalPrice());
    message.success("Location saved. Proceeding to payment…");
    setModalVisible(false);
    navigate("/PaymentDetails");
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      return message.error("Geolocation not supported.");
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const r = await axios.get(
            "https://nominatim.openstreetmap.org/reverse",
            {
              params: {
                lat: coords.latitude,
                lon: coords.longitude,
                format: "json",
                "accept-language": "ta"
              }
            }
          );
          setLocation(r.data.display_name || "");
          message.success("Location detected!");
        } catch {
          setLocation(
            `Lat:${coords.latitude.toFixed(2)},Lon:${coords.longitude.toFixed(
              2
            )}`
          );
          message.warning(
            "Could not resolve address, using coordinates."
          );
        } finally {
          setLocationLoading(false);
        }
      },
      err => {
        console.error(err);
        message.error("Unable to retrieve location.");
        setLocationLoading(false);
      }
    );
  };

  return (
    <div>
      <UserComponent user={user} />
      <div className="containerorder">
        <h2>Package Order Summary</h2>
        {cart.length ? (
          <div className="cart">
            {cart.map(item => (
              <div key={item._id} className="cart-item">
                <h4>{item.name}</h4>
                <p>Rs. {item.finalPrice.toFixed(2)}</p>
                <Input
                  type="number"
                  min={1}
                  max={25}
                  value={item.quantity}
                  onChange={e =>
                    handleQuantityChange(item._id, e.target.value)
                  }
                  onFocus={e => e.target.select()}
                  onBlur={e => {
                    if (!e.target.value)
                      handleQuantityChange(item._id, "1");
                  }}
                />
                <Button
                  id="b3"
                  onClick={() => handleRemoveFromCart(item._id)}
                  type="danger"
                >
                  Remove
                </Button>
              </div>
            ))}
            <h3>Total: Rs {getTotalPrice()}</h3>
            <Checkbox onChange={e => setIsAgreed(e.target.checked)}>
              I agree to the{" "}
              <a
                href="/terms-and-conditions"
                target="_blank"
                rel="noreferrer"
              >
                Terms and Conditions
              </a>
              .
            </Checkbox>
            <Button
              className="pay-button"
              onClick={handlePay}
              type="primary"
              disabled={!isAgreed}
            >
              Pay
            </Button>
          </div>
        ) : (
          <p>No packages in the cart.</p>
        )}

        <Button
          className="order-history-button"
          onClick={() => navigate("/OrderHistoryDetails")}
          type="default"
        >
          Order History
        </Button>

        <Modal
          title="Enter Your Location & Phone"
          open={modalVisible}
          onOk={handleConfirmLocation}
          onCancel={() => setModalVisible(false)}
          okText="Proceed to Pay"
        >
          <Input
            placeholder="Enter your location"
            value={location}
            onChange={e => setLocation(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <Button
            onClick={getUserLocation}
            disabled={locationLoading}
            style={{ marginBottom: 10 }}
          >
            {locationLoading
              ? "📍 Finding your location..."
              : "Share My Location"}
          </Button>
          <Input
            placeholder="Enter your Phone Number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            maxLength={10}
          />
        </Modal>
      </div>
    </div>
  );
};

export default OrderPage;

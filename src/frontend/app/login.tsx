import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
    darkBlue: "#273462",
    vibrantBlue: "#0062CC",
    white: "#FFFFFF",
    background: "#F4F6F9",
    grayText: "#8E8E93",
    lightGray: "#E2E8F0",
};

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = () => {
        console.log("Mock Login efetuado com sucesso!");
        router.replace("/");
    };

    const handleGoToRegister = () => {
        router.push("/registerUser");
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>



                <View style={styles.formContainer}>
                    <Text style={styles.welcomeText}>Bem-vindo de volta!</Text>
                    <Text style={styles.subtitleText}>Faça login para continuar no PResco.</Text>

                    <InputField
                        icon="mail-outline"
                        placeholder="Seu e-mail"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                    />

                    <PasswordField
                        value={password}
                        onChangeText={setPassword}
                        showPassword={showPassword}
                        toggleShowPassword={() => setShowPassword(!showPassword)}
                    />

                    <TouchableOpacity style={styles.forgotPassword} activeOpacity={0.7}>
                        <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.loginButton} activeOpacity={0.8} onPress={handleLogin}>
                        <Text style={styles.loginButtonText}>Entrar</Text>
                    </TouchableOpacity>
                </View>

                <FooterLinks onGoToRegister={handleGoToRegister} />

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// --- Componentes Internos ---



const InputField = ({ icon, placeholder, value, onChangeText, keyboardType = "default" }: any) => (
    <View style={styles.inputContainer}>
        <Ionicons name={icon} size={20} color={COLORS.grayText} style={styles.inputIcon} />
        <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={COLORS.grayText}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            autoCapitalize="none"
        />
    </View>
);

const PasswordField = ({ value, onChangeText, showPassword, toggleShowPassword }: any) => (
    <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color={COLORS.grayText} style={styles.inputIcon} />
        <TextInput
            style={styles.input}
            placeholder="Sua senha"
            placeholderTextColor={COLORS.grayText}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={toggleShowPassword} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.grayText} />
        </TouchableOpacity>
    </View>
);

const FooterLinks = ({ onGoToRegister }: { onGoToRegister: () => void }) => (
    <View style={styles.footerContainer}>
        <Text style={styles.footerText}>Não tem uma conta? </Text>
        <TouchableOpacity onPress={onGoToRegister} activeOpacity={0.7}>
            <Text style={styles.registerText}>Cadastre-se</Text>
        </TouchableOpacity>
    </View>
);

// --- Estilos ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 40,
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.white,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        marginBottom: 16,
    },
    logoImage: {
        width: 55,
        height: 55,
        resizeMode: "contain",
    },
    brandName: {
        fontSize: 28,
        fontWeight: "bold",
        color: COLORS.darkBlue,
        letterSpacing: 1,
    },
    formContainer: {
        width: "100%",
        backgroundColor: COLORS.white,
        padding: 24,
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.03,
        shadowRadius: 16,
        elevation: 2,
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: "bold",
        color: COLORS.darkBlue,
        marginBottom: 8,
    },
    subtitleText: {
        fontSize: 14,
        color: COLORS.grayText,
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.background,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: COLORS.darkBlue,
        height: "100%",
    },
    eyeIcon: {
        padding: 8,
    },
    forgotPassword: {
        alignSelf: "flex-end",
        marginBottom: 24,
    },
    forgotPasswordText: {
        color: COLORS.vibrantBlue,
        fontSize: 14,
        fontWeight: "600",
    },
    loginButton: {
        backgroundColor: COLORS.vibrantBlue,
        height: 56,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.vibrantBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: "bold",
        letterSpacing: 0.5,
    },
    footerContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 32,
    },
    footerText: {
        color: COLORS.grayText,
        fontSize: 15,
    },
    registerText: {
        color: COLORS.vibrantBlue,
        fontSize: 15,
        fontWeight: "bold",
    },
});
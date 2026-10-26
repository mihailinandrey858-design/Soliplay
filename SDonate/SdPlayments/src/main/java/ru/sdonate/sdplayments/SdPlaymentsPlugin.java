package ru.sdonate.sdplayments;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.List;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;

public final class SdPlaymentsPlugin extends JavaPlugin {
    private String apiBaseUrl;
    private boolean testMode;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        if (!loadSettings()) {
            getServer().getPluginManager().disablePlugin(this);
            return;
        }

        if (getCommand("sdplayments") == null) {
            getLogger().severe("Command sdplayments is missing from plugin.yml.");
            getServer().getPluginManager().disablePlugin(this);
            return;
        }

        getCommand("sdplayments").setExecutor(this);
        getLogger().info("Enabled in safe foundation mode. No payment API requests are sent.");
        if (!isApiTokenConfigured()) {
            getLogger().warning("No API token configured. Real payment delivery is unavailable.");
        }
    }

    private boolean loadSettings() {
        reloadConfig();
        apiBaseUrl = getConfig().getString("api.base-url", "").trim();
        testMode = getConfig().getBoolean("test-mode", true);

        if (!apiBaseUrl.isEmpty() && !isAllowedApiUrl(apiBaseUrl)) {
            getLogger().severe("api.base-url must use HTTPS. HTTP is allowed only for localhost.");
            return false;
        }
        return true;
    }

    private boolean isAllowedApiUrl(String value) {
        try {
            URL url = new URL(value);
            String protocol = url.getProtocol();
            String host = url.getHost();
            boolean localHost = "localhost".equalsIgnoreCase(host)
                    || "127.0.0.1".equals(host)
                    || "::1".equals(host);
            return ("https".equalsIgnoreCase(protocol) || ("http".equalsIgnoreCase(protocol) && localHost))
                    && !host.isEmpty()
                    && url.getUserInfo() == null
                    && url.getQuery() == null
                    && url.getRef() == null;
        } catch (MalformedURLException exception) {
            return false;
        }
    }

    private boolean isApiTokenConfigured() {
        return !getConfig().getString("api.token", "").trim().isEmpty();
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!sender.hasPermission("sdplayments.admin")) {
            sender.sendMessage(ChatColor.RED + "У тебя нет прав на эту команду.");
            return true;
        }

        if (args.length == 0 || "status".equalsIgnoreCase(args[0])) {
            sendStatus(sender);
            return true;
        }

        if ("reload".equalsIgnoreCase(args[0])) {
            if (loadSettings()) {
                sender.sendMessage(ChatColor.GREEN + "Настройки SdPlayments перезагружены.");
            } else {
                sender.sendMessage(ChatColor.RED + "Настройки не загружены. Проверь api.base-url в config.yml.");
            }
            return true;
        }

        if ("test".equalsIgnoreCase(args[0])) {
            sendTestModeNotice(sender, args);
            return true;
        }

        sendUsage(sender, label);
        return true;
    }

    private void sendStatus(CommandSender sender) {
        sender.sendMessage(ChatColor.AQUA + "SdPlayments " + ChatColor.GRAY + getDescription().getVersion());
        sender.sendMessage(ChatColor.GRAY + "Режим тестирования: "
                + (testMode ? ChatColor.YELLOW + "включён" : ChatColor.GREEN + "выключен"));
        sender.sendMessage(ChatColor.GRAY + "Адрес API: "
                + (apiBaseUrl.isEmpty() ? ChatColor.YELLOW + "не настроен" : ChatColor.GREEN + "настроен"));
        sender.sendMessage(ChatColor.GRAY + "Токен API: "
                + (isApiTokenConfigured() ? ChatColor.GREEN + "задан" : ChatColor.YELLOW + "не задан"));
        sender.sendMessage(ChatColor.YELLOW + "Подключение платежей не реализовано: backend SDonate пока отсутствует.");
    }

    private void sendTestModeNotice(CommandSender sender, String[] args) {
        if (!testMode) {
            sender.sendMessage(ChatColor.RED + "Тестовый режим выключен.");
            return;
        }
        if (args.length != 2) {
            sender.sendMessage(ChatColor.YELLOW + "Использование: /sdplayments test <игрок>");
            return;
        }

        Player target = Bukkit.getPlayerExact(args[1]);
        if (target == null) {
            sender.sendMessage(ChatColor.RED + "Игрок должен быть онлайн.");
            return;
        }

        sender.sendMessage(ChatColor.YELLOW + "Тестовый режим: реальная оплата и выдача предметов не выполнялись.");
        target.sendMessage(ChatColor.GRAY + "Проверка SdPlayments запрошена администратором. Донат не начислен.");
        getLogger().info("Admin test ping sent to " + target.getName() + "; no purchase was created.");
    }

    private void sendUsage(CommandSender sender, String label) {
        List<String> lines = java.util.Arrays.asList(
                ChatColor.YELLOW + "/" + label + " status",
                ChatColor.YELLOW + "/" + label + " reload",
                ChatColor.YELLOW + "/" + label + " test <игрок> " + ChatColor.GRAY + "(без выдачи)"
        );
        for (String line : lines) {
            sender.sendMessage(line);
        }
    }
}
